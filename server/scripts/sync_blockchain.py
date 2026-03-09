#!/usr/bin/env python3
"""
命运塔 V2.0 - Web4.0 链上数据同步脚本
功能：同步链上交易、更新余额、处理充值确认
"""

import sys
import os
import time
import json
import logging
import sqlite3
import argparse
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# 添加父目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web3 import Web3

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('sync_blockchain.log')
    ]
)
logger = logging.getLogger('blockchain_sync')


@dataclass
class ChainConfig:
    """链配置"""
    name: str
    rpc_url: str
    chain_id: int
    confirmations: int
    block_time: int
    platform_wallet: str


# 链配置
CHAIN_CONFIGS = {
    'ethereum': ChainConfig(
        name='Ethereum',
        rpc_url='https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        chain_id=1,
        confirmations=12,
        block_time=12,
        platform_wallet='0x1234567890123456789012345678901234567890'
    ),
    'bsc': ChainConfig(
        name='BNB Chain',
        rpc_url='https://bsc-dataseed.binance.org',
        chain_id=56,
        confirmations=15,
        block_time=3,
        platform_wallet='0x1234567890123456789012345678901234567890'
    ),
    'polygon': ChainConfig(
        name='Polygon',
        rpc_url='https://polygon-rpc.com',
        chain_id=137,
        confirmations=20,
        block_time=2,
        platform_wallet='0x1234567890123456789012345678901234567890'
    ),
    'arbitrum': ChainConfig(
        name='Arbitrum',
        rpc_url='https://arb1.arbitrum.io/rpc',
        chain_id=42161,
        confirmations=12,
        block_time=0.25,
        platform_wallet='0x1234567890123456789012345678901234567890'
    ),
    'optimism': ChainConfig(
        name='Optimism',
        rpc_url='https://mainnet.optimism.io',
        chain_id=10,
        confirmations=12,
        block_time=2,
        platform_wallet='0x1234567890123456789012345678901234567890'
    ),
    'base': ChainConfig(
        name='Base',
        rpc_url='https://mainnet.base.org',
        chain_id=8453,
        confirmations=12,
        block_time=2,
        platform_wallet='0x1234567890123456789012345678901234567890'
    )
}


class BlockchainSync:
    """区块链同步器"""

    def __init__(self, db_path: str = 'toweroffate_v2.db'):
        self.db_path = db_path
        self.web3_instances: Dict[str, Web3] = {}
        self._init_web3()

    def _init_web3(self):
        """初始化Web3连接"""
        for chain_name, config in CHAIN_CONFIGS.items():
            try:
                w3 = Web3(Web3.HTTPProvider(config.rpc_url))
                if w3.is_connected():
                    self.web3_instances[chain_name] = w3
                    logger.info(f"✅ 已连接到 {config.name}")
                else:
                    logger.warning(f"⚠️ 无法连接到 {config.name}")
            except Exception as e:
                logger.error(f"❌ 连接 {config.name} 失败: {e}")

    def get_db_connection(self) -> sqlite3.Connection:
        """获取数据库连接"""
        return sqlite3.connect(self.db_path)

    def get_monitored_wallets(self, chain_type: str) -> List[Tuple[int, str]]:
        """获取需要监控的钱包地址"""
        conn = self.get_db_connection()
        c = conn.cursor()

        c.execute('''
            SELECT user_id, wallet_address
            FROM user_wallets
            WHERE chain_type = ?
        ''', (chain_type,))

        wallets = c.fetchall()
        conn.close()

        return wallets

    def get_last_synced_block(self, chain_type: str) -> int:
        """获取上次同步的区块高度"""
        conn = self.get_db_connection()
        c = conn.cursor()

        c.execute('''
            CREATE TABLE IF NOT EXISTS sync_status (
                chain_type TEXT PRIMARY KEY,
                last_block INTEGER,
                last_sync TIMESTAMP
            )
        ''')

        c.execute('''
            SELECT last_block FROM sync_status WHERE chain_type = ?
        ''', (chain_type,))

        result = c.fetchone()
        conn.close()

        if result and result[0]:
            return result[0]

        # 默认返回当前区块前1000个
        w3 = self.web3_instances.get(chain_type)
        if w3:
            return w3.eth.block_number - 1000

        return 0

    def update_sync_status(self, chain_type: str, block_number: int):
        """更新同步状态"""
        conn = self.get_db_connection()
        c = conn.cursor()

        c.execute('''
            INSERT OR REPLACE INTO sync_status (chain_type, last_block, last_sync)
            VALUES (?, ?, ?)
        ''', (chain_type, block_number, datetime.now()))

        conn.commit()
        conn.close()

    def scan_deposits(self, chain_type: str, from_block: int, to_block: int) -> List[Dict]:
        """扫描区块中的充值交易"""
        w3 = self.web3_instances.get(chain_type)
        if not w3:
            logger.error(f"未连接到 {chain_type}")
            return []

        config = CHAIN_CONFIGS[chain_type]
        platform_wallet = config.platform_wallet.lower()

        # 获取监控的钱包地址
        monitored_wallets = self.get_monitored_wallets(chain_type)
        monitored_set = {addr.lower() for _, addr in monitored_wallets}
        user_map = {addr.lower(): uid for uid, addr in monitored_wallets}

        deposits = []

        logger.info(f"🔍 扫描 {chain_type} 区块 {from_block} - {to_block}")

        for block_num in range(from_block, to_block + 1):
            try:
                block = w3.eth.get_block(block_num, full_transactions=True)

                for tx in block.transactions:
                    to_addr = tx.get('to')
                    if not to_addr:
                        continue

                    # 检查是否是充值到平台地址
                    if to_addr.lower() == platform_wallet:
                        from_addr = tx['from'].lower()

                        # 检查是否来自用户绑定的地址
                        if from_addr in monitored_set:
                            deposit = {
                                'tx_hash': tx['hash'].hex(),
                                'user_id': user_map[from_addr],
                                'wallet_address': from_addr,
                                'chain_type': chain_type,
                                'currency': 'ETH',  # 根据链调整
                                'amount': float(w3.from_wei(tx['value'], 'ether')),
                                'block_number': block_num,
                                'confirmations': to_block - block_num + 1
                            }
                            deposits.append(deposit)

                            logger.info(f"💰 发现充值: {deposit['amount']} {deposit['currency']} "
                                      f"from {from_addr[:10]}... tx: {deposit['tx_hash'][:16]}...")

            except Exception as e:
                logger.error(f"扫描区块 {block_num} 失败: {e}")

        return deposits

    def process_deposit(self, deposit: Dict) -> bool:
        """处理充值记录"""
        conn = self.get_db_connection()
        c = conn.cursor()

        try:
            # 检查交易是否已存在
            c.execute('''
                SELECT id, status FROM transactions WHERE tx_hash = ?
            ''', (deposit['tx_hash'],))

            existing = c.fetchone()
            if existing:
                logger.debug(f"交易 {deposit['tx_hash'][:16]}... 已存在")
                return False

            config = CHAIN_CONFIGS[deposit['chain_type']]

            # 检查确认数
            if deposit['confirmations'] >= config.confirmations:
                status = 'confirmed'
                confirmed_at = datetime.now()
            else:
                status = 'pending'
                confirmed_at = None

            # 插入交易记录
            c.execute('''
                INSERT INTO transactions
                (tx_hash, user_id, wallet_address, type, currency, amount,
                 status, chain_type, confirmations, created_at, confirmed_at, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                deposit['tx_hash'],
                deposit['user_id'],
                deposit['wallet_address'],
                'deposit',
                deposit['currency'],
                deposit['amount'],
                status,
                deposit['chain_type'],
                deposit['confirmations'],
                datetime.now(),
                confirmed_at,
                f"链上同步充值 {deposit['amount']} {deposit['currency']}"
            ))

            # 如果已确认，更新用户余额
            if status == 'confirmed':
                # 转换为钻石 (假设 1 ETH = 100钻石)
                diamond_amount = int(deposit['amount'] * 100)

                c.execute('''
                    UPDATE users SET diamond = diamond + ? WHERE id = ?
                ''', (diamond_amount, deposit['user_id']))

                logger.info(f"✅ 充值确认: 用户 {deposit['user_id']} 获得 {diamond_amount} 钻石")

            conn.commit()
            return True

        except Exception as e:
            conn.rollback()
            logger.error(f"处理充值失败: {e}")
            return False
        finally:
            conn.close()

    def update_pending_deposits(self, chain_type: str):
        """更新待确认的交易"""
        conn = self.get_db_connection()
        c = conn.cursor()

        config = CHAIN_CONFIGS[chain_type]
        w3 = self.web3_instances.get(chain_type)

        if not w3:
            return

        current_block = w3.eth.block_number

        # 获取待确认的交易
        c.execute('''
            SELECT tx_hash, block_number, user_id, amount
            FROM transactions
            WHERE chain_type = ? AND type = 'deposit' AND status = 'pending'
        ''', (chain_type,))

        pending = c.fetchall()

        for tx_hash, block_number, user_id, amount in pending:
            try:
                confirmations = current_block - block_number + 1

                if confirmations >= config.confirmations:
                    # 获取交易回执验证成功
                    receipt = w3.eth.get_transaction_receipt(tx_hash)

                    if receipt and receipt['status'] == 1:
                        # 更新为已确认
                        c.execute('''
                            UPDATE transactions
                            SET status = 'confirmed', confirmations = ?, confirmed_at = ?
                            WHERE tx_hash = ?
                        ''', (confirmations, datetime.now(), tx_hash))

                        # 更新用户余额
                        diamond_amount = int(amount * 100)
                        c.execute('''
                            UPDATE users SET diamond = diamond + ? WHERE id = ?
                        ''', (diamond_amount, user_id))

                        logger.info(f"✅ 待确认交易已确认: {tx_hash[:16]}... 用户 {user_id} +{diamond_amount} 钻石")
                    else:
                        # 交易失败
                        c.execute('''
                            UPDATE transactions
                            SET status = 'failed', confirmations = ?
                            WHERE tx_hash = ?
                        ''', (confirmations, tx_hash))

                        logger.warning(f"❌ 交易失败: {tx_hash[:16]}...")
                else:
                    # 更新确认数
                    c.execute('''
                        UPDATE transactions
                        SET confirmations = ?
                        WHERE tx_hash = ?
                    ''', (confirmations, tx_hash))

                conn.commit()

            except Exception as e:
                logger.error(f"更新待确认交易 {tx_hash[:16]}... 失败: {e}")

        conn.close()

    def sync_balances(self, chain_type: str):
        """同步钱包余额"""
        w3 = self.web3_instances.get(chain_type)
        if not w3:
            return

        wallets = self.get_monitored_wallets(chain_type)

        conn = self.get_db_connection()
        c = conn.cursor()

        for user_id, wallet_address in wallets:
            try:
                # 获取ETH余额
                balance_wei = w3.eth.get_balance(wallet_address)
                balance_eth = float(w3.from_wei(balance_wei, 'ether'))

                balances = {
                    'ETH': round(balance_eth, 6)
                }

                # 更新余额缓存
                c.execute('''
                    INSERT OR REPLACE INTO wallet_balances
                    (wallet_address, chain_type, balances, updated_at)
                    VALUES (?, ?, ?, ?)
                ''', (wallet_address.lower(), chain_type, json.dumps(balances), datetime.now()))

                logger.debug(f"余额同步: {wallet_address[:10]}... = {balance_eth} ETH")

            except Exception as e:
                logger.error(f"同步余额失败 {wallet_address[:10]}...: {e}")

        conn.commit()
        conn.close()

    def sync_chain(self, chain_type: str):
        """同步单个链的数据"""
        if chain_type not in self.web3_instances:
            logger.warning(f"跳过 {chain_type}: 未连接")
            return

        w3 = self.web3_instances[chain_type]

        try:
            current_block = w3.eth.block_number
            last_synced = self.get_last_synced_block(chain_type)

            # 限制每次扫描的区块数
            batch_size = 100
            to_block = min(current_block, last_synced + batch_size)

            if last_synced >= current_block:
                logger.debug(f"{chain_type} 已是最新")
                return

            # 扫描充值
            deposits = self.scan_deposits(chain_type, last_synced + 1, to_block)

            for deposit in deposits:
                self.process_deposit(deposit)

            # 更新待确认交易
            self.update_pending_deposits(chain_type)

            # 同步余额
            self.sync_balances(chain_type)

            # 更新同步状态
            self.update_sync_status(chain_type, to_block)

            logger.info(f"✅ {chain_type} 同步完成: 区块 {last_synced} -> {to_block}, "
                       f"发现 {len(deposits)} 笔充值")

        except Exception as e:
            logger.error(f"同步 {chain_type} 失败: {e}")

    def sync_all(self):
        """同步所有链"""
        logger.info("🚀 开始全链同步")

        for chain_type in CHAIN_CONFIGS.keys():
            self.sync_chain(chain_type)

        logger.info("🎉 全链同步完成")

    def run_continuous(self, interval: int = 60):
        """持续运行同步"""
        logger.info(f"🔄 启动持续同步模式 (间隔: {interval}秒)")

        while True:
            try:
                self.sync_all()
            except Exception as e:
                logger.error(f"同步循环错误: {e}")

            time.sleep(interval)


def init_database(db_path: str = 'toweroffate_v2.db'):
    """初始化数据库表"""
    conn = sqlite3.connect(db_path)
    c = conn.cursor()

    # 同步状态表
    c.execute('''
        CREATE TABLE IF NOT EXISTS sync_status (
            chain_type TEXT PRIMARY KEY,
            last_block INTEGER,
            last_sync TIMESTAMP
        )
    ''')

    # 用户钱包表
    c.execute('''
        CREATE TABLE IF NOT EXISTS user_wallets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            wallet_address TEXT NOT NULL,
            chain_type TEXT NOT NULL,
            is_primary BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, wallet_address, chain_type)
        )
    ''')

    # 交易记录表
    c.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            wallet_address TEXT,
            type TEXT NOT NULL DEFAULT 'deposit',
            currency TEXT NOT NULL DEFAULT 'ETH',
            amount REAL NOT NULL DEFAULT 0,
            fee REAL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'pending',
            chain_type TEXT DEFAULT 'ethereum',
            confirmations INTEGER DEFAULT 0,
            description TEXT,
            metadata TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            confirmed_at TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tx_hash, type)
        )
    ''')

    # 余额缓存表
    c.execute('''
        CREATE TABLE IF NOT EXISTS wallet_balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT NOT NULL,
            chain_type TEXT NOT NULL,
            balances TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(wallet_address, chain_type)
        )
    ''')

    # 用户表 (简化版)
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            nickname TEXT NOT NULL,
            diamond INTEGER DEFAULT 0,
            gold INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    conn.commit()
    conn.close()

    logger.info("✅ 数据库初始化完成")


def main():
    parser = argparse.ArgumentParser(description='命运塔 V2.0 区块链同步脚本')
    parser.add_argument('--init', action='store_true', help='初始化数据库')
    parser.add_argument('--db', default='toweroffate_v2.db', help='数据库路径')
    parser.add_argument('--chain', help='指定同步的链 (ethereum/bsc/polygon/...)')
    parser.add_argument('--continuous', action='store_true', help='持续同步模式')
    parser.add_argument('--interval', type=int, default=60, help='同步间隔(秒)')

    args = parser.parse_args()

    if args.init:
        init_database(args.db)
        return

    sync = BlockchainSync(args.db)

    if args.chain:
        sync.sync_chain(args.chain)
    elif args.continuous:
        sync.run_continuous(args.interval)
    else:
        sync.sync_all()


if __name__ == '__main__':
    main()
