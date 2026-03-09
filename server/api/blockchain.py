"""
命运塔 V2.0 - Web4.0 区块链交互API
功能：监听链上交易、确认充值到账、发起提款请求
"""

from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
import json
import hashlib
from typing import Dict, List, Optional
from web3 import Web3
from eth_abi import decode

blockchain_bp = Blueprint('blockchain', __name__, url_prefix='/api/v2/blockchain')

# 链配置
CHAIN_CONFIG = {
    'ethereum': {
        'rpc_url': 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        'chain_id': 1,
        'confirmations': 12,
        'native_currency': 'ETH'
    },
    'bsc': {
        'rpc_url': 'https://bsc-dataseed.binance.org',
        'chain_id': 56,
        'confirmations': 15,
        'native_currency': 'BNB'
    },
    'polygon': {
        'rpc_url': 'https://polygon-rpc.com',
        'chain_id': 137,
        'confirmations': 20,
        'native_currency': 'MATIC'
    },
    'arbitrum': {
        'rpc_url': 'https://arb1.arbitrum.io/rpc',
        'chain_id': 42161,
        'confirmations': 12,
        'native_currency': 'ETH'
    },
    'optimism': {
        'rpc_url': 'https://mainnet.optimism.io',
        'chain_id': 10,
        'confirmations': 12,
        'native_currency': 'ETH'
    },
    'base': {
        'rpc_url': 'https://mainnet.base.org',
        'chain_id': 8453,
        'confirmations': 12,
        'native_currency': 'ETH'
    }
}

# 平台收款地址（各链）
PLATFORM_WALLETS = {
    'ethereum': '0x1234567890123456789012345678901234567890',
    'bsc': '0x1234567890123456789012345678901234567890',
    'polygon': '0x1234567890123456789012345678901234567890',
    'arbitrum': '0x1234567890123456789012345678901234567890',
    'optimism': '0x1234567890123456789012345678901234567890',
    'base': '0x1234567890123456789012345678901234567890'
}

# ERC20 Token ABI (简化版)
ERC20_ABI = [
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True, "name": "from", "type": "address"},
            {"indexed": True, "name": "to", "type": "address"},
            {"indexed": False, "name": "value", "type": "uint256"}
        ],
        "name": "Transfer",
        "type": "event"
    }
]

# 支持的代币合约地址
TOKEN_CONTRACTS = {
    'ethereum': {
        'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'USDC': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        'DAI': '0x6B175474E89094C44Da98b954EedeAC495271d0F'
    },
    'bsc': {
        'USDT': '0x55d398326f99059fF775485246999027B3197955',
        'USDC': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        'BUSD': '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'
    },
    'polygon': {
        'USDT': '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
        'USDC': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
        'DAI': '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
    }
}


def get_db_connection():
    """获取数据库连接"""
    import sqlite3
    return sqlite3.connect('toweroffate_v2.db')


def get_web3(chain_type: str) -> Web3:
    """获取Web3实例"""
    config = CHAIN_CONFIG.get(chain_type)
    if not config:
        raise ValueError(f'不支持的链类型: {chain_type}')
    return Web3(Web3.HTTPProvider(config['rpc_url']))


def verify_transaction_signature(chain_type: str, tx_hash: str, expected_from: str) -> Dict:
    """验证交易签名和详情"""
    try:
        w3 = get_web3(chain_type)
        tx = w3.eth.get_transaction(tx_hash)
        receipt = w3.eth.get_transaction_receipt(tx_hash)

        if not tx or not receipt:
            return {'valid': False, 'error': '交易不存在'}

        if receipt['status'] != 1:
            return {'valid': False, 'error': '交易执行失败'}

        if tx['from'].lower() != expected_from.lower():
            return {'valid': False, 'error': '交易发送方不匹配'}

        # 获取当前区块确认数
        current_block = w3.eth.block_number
        confirmations = current_block - receipt['blockNumber']
        required_confirmations = CHAIN_CONFIG[chain_type]['confirmations']

        return {
            'valid': True,
            'confirmations': confirmations,
            'confirmed': confirmations >= required_confirmations,
            'to': tx.get('to', '').lower(),
            'value': tx.get('value', 0),
            'gas_used': receipt['gasUsed'],
            'block_number': receipt['blockNumber']
        }

    except Exception as e:
        return {'valid': False, 'error': str(e)}


@blockchain_bp.route('/deposit/verify', methods=['POST'])
def verify_deposit():
    """
    验证充值交易
    Request: { user_id, tx_hash, chain_type, currency, amount }
    """
    data = request.json
    user_id = data.get('user_id')
    tx_hash = data.get('tx_hash')
    chain_type = data.get('chain_type', 'ethereum')
    currency = data.get('currency', 'ETH')
    expected_amount = data.get('amount')

    if not all([user_id, tx_hash]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 检查交易是否已处理
        c.execute('SELECT status FROM transactions WHERE tx_hash = ?', (tx_hash,))
        existing = c.fetchone()
        if existing:
            return jsonify({
                'code': 409,
                'message': '该交易已处理',
                'data': {'status': existing[0]}
            }), 409

        # 获取用户主钱包
        c.execute('''
            SELECT wallet_address FROM user_wallets
            WHERE user_id = ? AND chain_type = ? AND is_primary = 1
        ''', (user_id, chain_type))
        wallet = c.fetchone()

        if not wallet:
            return jsonify({'code': 404, 'message': '未找到该链的主钱包'}), 404

        wallet_address = wallet[0]

        # 验证链上交易
        verification = verify_transaction_signature(chain_type, tx_hash, wallet_address)

        if not verification['valid']:
            return jsonify({
                'code': 400,
                'message': '交易验证失败',
                'data': {'error': verification.get('error')}
            }), 400

        # 检查是否确认足够
        if not verification['confirmed']:
            return jsonify({
                'code': 202,
                'message': '交易确认中',
                'data': {
                    'confirmations': verification['confirmations'],
                    'required': CHAIN_CONFIG[chain_type]['confirmations']
                }
            })

        # 验证收款地址
        platform_wallet = PLATFORM_WALLETS.get(chain_type, '').lower()
        if verification['to'] != platform_wallet:
            return jsonify({
                'code': 400,
                'message': '收款地址不是平台地址'
            }), 400

        # 创建充值记录
        actual_amount = float(verification['value']) / (10 ** 18)  # ETH精度

        c.execute('''
            INSERT INTO transactions
            (tx_hash, user_id, wallet_address, type, currency, amount,
             status, chain_type, confirmations, created_at, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            tx_hash, user_id, wallet_address, 'deposit', currency,
            actual_amount, 'confirmed', chain_type,
            verification['confirmations'], datetime.now(),
            f'充值 {actual_amount} {currency}'
        ))

        # 更新用户余额
        c.execute('''
            UPDATE users SET diamond = diamond + ? WHERE id = ?
        ''', (int(actual_amount * 100), user_id))  # 假设1 ETH = 100钻石

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '充值确认成功',
            'data': {
                'tx_hash': tx_hash,
                'amount': actual_amount,
                'currency': currency,
                'confirmations': verification['confirmations'],
                'diamond_added': int(actual_amount * 100)
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'验证失败: {str(e)}'}), 500
    finally:
        conn.close()


@blockchain_bp.route('/withdrawal/request', methods=['POST'])
def request_withdrawal():
    """
    发起提款请求
    Request: { user_id, wallet_address, chain_type, currency, amount }
    """
    data = request.json
    user_id = data.get('user_id')
    wallet_address = data.get('wallet_address', '').lower()
    chain_type = data.get('chain_type', 'ethereum')
    currency = data.get('currency', 'ETH')
    amount = float(data.get('amount', 0))

    if not all([user_id, wallet_address, amount]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    if amount <= 0:
        return jsonify({'code': 400, 'message': '提款金额必须大于0'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 验证钱包归属
        c.execute('''
            SELECT id FROM user_wallets
            WHERE user_id = ? AND wallet_address = ? AND chain_type = ?
        ''', (user_id, wallet_address, chain_type))

        if not c.fetchone():
            return jsonify({'code': 404, 'message': '钱包不存在或无权限'}), 404

        # 检查用户余额
        diamond_amount = int(amount * 100)  # 转换为钻石
        c.execute('SELECT diamond FROM users WHERE id = ?', (user_id,))
        user = c.fetchone()

        if not user or user[0] < diamond_amount:
            return jsonify({'code': 400, 'message': '余额不足'}), 400

        # 计算手续费
        from services.payment_service import PaymentService
        payment_service = PaymentService()
        fee = payment_service.calculate_withdrawal_fee(chain_type, currency, amount)
        final_amount = amount - fee

        if final_amount <= 0:
            return jsonify({'code': 400, 'message': '扣除手续费后金额不足'}), 400

        # 生成提款ID
        withdrawal_id = f"WD{datetime.now().strftime('%Y%m%d%H%M%S')}{hashlib.md5(f'{user_id}{datetime.now()}'.encode()).hexdigest()[:6]}"

        # 扣除余额并创建提款记录
        c.execute('''
            UPDATE users SET diamond = diamond - ? WHERE id = ?
        ''', (diamond_amount, user_id))

        c.execute('''
            INSERT INTO transactions
            (tx_hash, user_id, wallet_address, type, currency, amount,
             fee, status, chain_type, created_at, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            withdrawal_id, user_id, wallet_address, 'withdrawal', currency,
            final_amount, fee, 'pending', chain_type, datetime.now(),
            f'提款 {final_amount} {currency}, 手续费 {fee}'
        ))

        conn.commit()

        # TODO: 发送到队列等待处理

        return jsonify({
            'code': 200,
            'message': '提款申请已提交',
            'data': {
                'withdrawal_id': withdrawal_id,
                'amount': final_amount,
                'fee': fee,
                'currency': currency,
                'target_address': wallet_address,
                'status': 'pending',
                'estimated_time': '1-24小时'
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'申请失败: {str(e)}'}), 500
    finally:
        conn.close()


@blockchain_bp.route('/withdrawal/cancel', methods=['POST'])
def cancel_withdrawal():
    """
    取消待处理的提款
    Request: { user_id, withdrawal_id }
    """
    data = request.json
    user_id = data.get('user_id')
    withdrawal_id = data.get('withdrawal_id')

    if not all([user_id, withdrawal_id]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 查询提款记录
        c.execute('''
            SELECT amount, status, currency FROM transactions
            WHERE tx_hash = ? AND user_id = ? AND type = 'withdrawal'
        ''', (withdrawal_id, user_id))

        withdrawal = c.fetchone()
        if not withdrawal:
            return jsonify({'code': 404, 'message': '提款记录不存在'}), 404

        amount, status, currency = withdrawal

        if status != 'pending':
            return jsonify({'code': 409, 'message': f'当前状态无法取消: {status}'}), 409

        # 恢复余额
        diamond_amount = int(float(amount) * 100)
        c.execute('''
            UPDATE users SET diamond = diamond + ? WHERE id = ?
        ''', (diamond_amount, user_id))

        # 更新提款状态
        c.execute('''
            UPDATE transactions SET status = 'cancelled', updated_at = ?
            WHERE tx_hash = ?
        ''', (datetime.now(), withdrawal_id))

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '提款已取消',
            'data': {
                'withdrawal_id': withdrawal_id,
                'refunded_amount': amount,
                'currency': currency
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'取消失败: {str(e)}'}), 500
    finally:
        conn.close()


@blockchain_bp.route('/monitor/deposits', methods=['GET'])
def monitor_deposits():
    """
    监听链上充值（供后台服务调用）
    Query: chain_type, from_block, to_block
    """
    chain_type = request.args.get('chain_type', 'ethereum')
    from_block = request.args.get('from_block', type=int)
    to_block = request.args.get('to_block', type=int)

    if chain_type not in CHAIN_CONFIG:
        return jsonify({'code': 400, 'message': '不支持的链类型'}), 400

    try:
        w3 = get_web3(chain_type)
        platform_wallet = PLATFORM_WALLETS.get(chain_type)

        if not from_block:
            from_block = w3.eth.block_number - 100
        if not to_block:
            to_block = w3.eth.block_number

        # 获取平台地址的交易
        deposits = []

        # 查询绑定该链的所有钱包地址
        conn = get_db_connection()
        c = conn.cursor()
        c.execute('''
            SELECT DISTINCT wallet_address FROM user_wallets WHERE chain_type = ?
        ''', (chain_type,))
        monitored_addresses = [row[0].lower() for row in c.fetchall()]
        conn.close()

        # 扫描区块
        for block_num in range(from_block, to_block + 1):
            block = w3.eth.get_block(block_num, full_transactions=True)

            for tx in block.transactions:
                if tx.get('to') and tx['to'].lower() == platform_wallet.lower():
                    from_addr = tx['from'].lower()

                    # 检查是否来自用户绑定的地址
                    if from_addr in monitored_addresses:
                        deposits.append({
                            'tx_hash': tx['hash'].hex(),
                            'from': from_addr,
                            'to': tx['to'],
                            'value': float(tx['value']) / (10 ** 18),
                            'block_number': block_num,
                            'chain_type': chain_type
                        })

        return jsonify({
            'code': 200,
            'data': {
                'chain_type': chain_type,
                'from_block': from_block,
                'to_block': to_block,
                'deposits_found': len(deposits),
                'deposits': deposits
            }
        })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'监听失败: {str(e)}'}), 500


@blockchain_bp.route('/webhook/deposit', methods=['POST'])
def deposit_webhook():
    """
    接收链上事件推送（用于第三方服务如Alchemy/Infura）
    """
    data = request.json

    # 验证Webhook签名
    signature = request.headers.get('X-Webhook-Signature')
    # TODO: 实现签名验证

    event_type = data.get('event_type')
    chain_type = data.get('chain_type')

    if event_type == 'deposit':
        tx_hash = data.get('tx_hash')
        from_addr = data.get('from_address', '').lower()
        amount = data.get('amount')
        currency = data.get('currency', 'ETH')

        conn = get_db_connection()
        c = conn.cursor()

        try:
            # 查找对应用户
            c.execute('''
                SELECT user_id FROM user_wallets
                WHERE wallet_address = ? AND chain_type = ?
            ''', (from_addr, chain_type))
            wallet = c.fetchone()

            if wallet:
                user_id = wallet[0]

                # 检查是否已处理
                c.execute('SELECT id FROM transactions WHERE tx_hash = ?', (tx_hash,))
                if not c.fetchone():
                    # 创建充值记录
                    c.execute('''
                        INSERT INTO transactions
                        (tx_hash, user_id, wallet_address, type, currency, amount,
                         status, chain_type, created_at, description)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        tx_hash, user_id, from_addr, 'deposit', currency,
                        amount, 'confirmed', chain_type, datetime.now(),
                        f'自动确认充值 {amount} {currency}'
                    ))

                    # 更新余额
                    diamond_amount = int(float(amount) * 100)
                    c.execute('''
                        UPDATE users SET diamond = diamond + ? WHERE id = ?
                    ''', (diamond_amount, user_id))

                    conn.commit()

                    return jsonify({'code': 200, 'message': '充值处理成功'})

        except Exception as e:
            conn.rollback()
            return jsonify({'code': 500, 'message': f'处理失败: {str(e)}'}), 500
        finally:
            conn.close()

    return jsonify({'code': 200, 'message': '已接收'})


@blockchain_bp.route('/gas/estimate', methods=['GET'])
def estimate_gas():
    """
    估算Gas费用
    Query: chain_type, currency, amount
    """
    chain_type = request.args.get('chain_type', 'ethereum')
    currency = request.args.get('currency', 'ETH')
    amount = request.args.get('amount', type=float)

    if chain_type not in CHAIN_CONFIG:
        return jsonify({'code': 400, 'message': '不支持的链类型'}), 400

    try:
        w3 = get_web3(chain_type)

        # 获取当前gas价格
        gas_price = w3.eth.gas_price
        gas_price_gwei = w3.from_wei(gas_price, 'gwei')

        # 估算转账gas（ETH转账约21000，代币转账约65000）
        if currency == CHAIN_CONFIG[chain_type]['native_currency']:
            estimated_gas = 21000
        else:
            estimated_gas = 65000

        estimated_fee_wei = gas_price * estimated_gas
        estimated_fee_eth = float(w3.from_wei(estimated_fee_wei, 'ether'))

        return jsonify({
            'code': 200,
            'data': {
                'chain_type': chain_type,
                'gas_price_gwei': float(gas_price_gwei),
                'estimated_gas': estimated_gas,
                'estimated_fee_eth': estimated_fee_eth,
                'estimated_fee_usd': estimated_fee_eth * 2000  # 假设ETH价格
            }
        })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'估算失败: {str(e)}'}), 500
