"""
命运塔 V2.0 - Web4.0 交易数据模型
包含：充值记录、提款记录、游戏内消费
"""

from datetime import datetime
from typing import Optional, Dict, Any
from enum import Enum
import json


class TransactionType(Enum):
    """交易类型"""
    DEPOSIT = "deposit"           # 充值
    WITHDRAWAL = "withdrawal"     # 提款
    GAME_PURCHASE = "game_purchase"  # 游戏内购买
    NFT_PURCHASE = "nft_purchase"    # NFT购买
    REWARD = "reward"             # 游戏奖励
    REFUND = "refund"             # 退款
    FEE = "fee"                   # 手续费


class TransactionStatus(Enum):
    """交易状态"""
    PENDING = "pending"           # 待处理
    PROCESSING = "processing"     # 处理中
    CONFIRMED = "confirmed"       # 已确认
    FAILED = "failed"             # 失败
    CANCELLED = "cancelled"       # 已取消
    REFUNDED = "refunded"         # 已退款


class Transaction:
    """
    交易记录模型

    数据库表: transactions
    """

    def __init__(
        self,
        tx_hash: str,
        user_id: int,
        wallet_address: Optional[str] = None,
        tx_type: TransactionType = TransactionType.DEPOSIT,
        currency: str = "ETH",
        amount: float = 0.0,
        fee: float = 0.0,
        status: TransactionStatus = TransactionStatus.PENDING,
        chain_type: str = "ethereum",
        confirmations: int = 0,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        created_at: Optional[datetime] = None,
        confirmed_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.tx_hash = tx_hash
        self.user_id = user_id
        self.wallet_address = wallet_address
        self.tx_type = tx_type
        self.currency = currency
        self.amount = amount
        self.fee = fee
        self.status = status
        self.chain_type = chain_type
        self.confirmations = confirmations
        self.description = description
        self.metadata = metadata or {}
        self.created_at = created_at or datetime.now()
        self.confirmed_at = confirmed_at
        self.updated_at = updated_at or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'tx_hash': self.tx_hash,
            'user_id': self.user_id,
            'wallet_address': self.wallet_address,
            'type': self.tx_type.value,
            'currency': self.currency,
            'amount': self.amount,
            'fee': self.fee,
            'status': self.status.value,
            'chain_type': self.chain_type,
            'confirmations': self.confirmations,
            'description': self.description,
            'metadata': self.metadata,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'confirmed_at': self.confirmed_at.isoformat() if self.confirmed_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def from_db_row(cls, row: tuple) -> 'Transaction':
        """从数据库行创建实例"""
        # 假设row顺序与表结构一致
        return cls(
            tx_hash=row[1],
            user_id=row[2],
            wallet_address=row[3],
            tx_type=TransactionType(row[4]),
            currency=row[5],
            amount=row[6],
            fee=row[7] if len(row) > 7 else 0.0,
            status=TransactionStatus(row[8]),
            chain_type=row[9],
            confirmations=row[10] if len(row) > 10 else 0,
            description=row[11] if len(row) > 11 else None,
            metadata=json.loads(row[12]) if len(row) > 12 and row[12] else {},
            created_at=datetime.fromisoformat(row[13]) if len(row) > 13 and row[13] else None,
            confirmed_at=datetime.fromisoformat(row[14]) if len(row) > 14 and row[14] else None,
            updated_at=datetime.fromisoformat(row[15]) if len(row) > 15 and row[15] else None
        )

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
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
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(tx_hash, type)
        );

        CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
        CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
        CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at);
        CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions(wallet_address);
        """


class DepositTransaction(Transaction):
    """充值交易"""

    def __init__(self, **kwargs):
        kwargs['tx_type'] = TransactionType.DEPOSIT
        super().__init__(**kwargs)
        self.source_tx_hash: Optional[str] = kwargs.get('source_tx_hash')
        self.block_number: Optional[int] = kwargs.get('block_number')


class WithdrawalTransaction(Transaction):
    """提款交易"""

    def __init__(self, **kwargs):
        kwargs['tx_type'] = TransactionType.WITHDRAWAL
        super().__init__(**kwargs)
        self.target_address: Optional[str] = kwargs.get('target_address')
        self.processed_by: Optional[int] = kwargs.get('processed_by')  # 处理人
        self.processed_at: Optional[datetime] = kwargs.get('processed_at')
        self.rejection_reason: Optional[str] = kwargs.get('rejection_reason')


class GamePurchaseTransaction(Transaction):
    """游戏内购买交易"""

    def __init__(self, **kwargs):
        kwargs['tx_type'] = TransactionType.GAME_PURCHASE
        super().__init__(**kwargs)
        self.item_id: Optional[str] = kwargs.get('item_id')
        self.item_name: Optional[str] = kwargs.get('item_name')
        self.item_type: Optional[str] = kwargs.get('item_type')  # card, skin,道具
        self.quantity: int = kwargs.get('quantity', 1)
        self.unit_price: float = kwargs.get('unit_price', 0.0)
        self.payment_method: str = kwargs.get('payment_method', 'diamond')  # diamond, gold, token


class TransactionLog:
    """
    交易日志模型
    用于记录交易状态变更历史
    """

    def __init__(
        self,
        tx_hash: str,
        from_status: TransactionStatus,
        to_status: TransactionStatus,
        operator: Optional[int] = None,
        reason: Optional[str] = None,
        created_at: Optional[datetime] = None
    ):
        self.tx_hash = tx_hash
        self.from_status = from_status
        self.to_status = to_status
        self.operator = operator
        self.reason = reason
        self.created_at = created_at or datetime.now()

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS transaction_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            from_status TEXT NOT NULL,
            to_status TEXT NOT NULL,
            operator INTEGER,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tx_hash) REFERENCES transactions(tx_hash)
        );

        CREATE INDEX IF NOT EXISTS idx_tx_logs_hash ON transaction_logs(tx_hash);
        """


class WalletBalance:
    """
    钱包余额缓存模型
    """

    def __init__(
        self,
        wallet_address: str,
        chain_type: str,
        balances: Dict[str, float],
        updated_at: Optional[datetime] = None
    ):
        self.wallet_address = wallet_address
        self.chain_type = chain_type
        self.balances = balances  # {currency: amount}
        self.updated_at = updated_at or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        return {
            'wallet_address': self.wallet_address,
            'chain_type': self.chain_type,
            'balances': self.balances,
            'updated_at': self.updated_at.isoformat()
        }

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS wallet_balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            wallet_address TEXT NOT NULL,
            chain_type TEXT NOT NULL,
            balances TEXT NOT NULL,  -- JSON格式
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(wallet_address, chain_type)
        );

        CREATE INDEX IF NOT EXISTS idx_wallet_balance_address ON wallet_balances(wallet_address);
        """


# 数据库初始化函数
def init_transaction_tables(db_connection):
    """初始化交易相关表"""
    c = db_connection.cursor()

    # 创建交易表
    c.execute(Transaction.create_table_sql())

    # 创建交易日志表
    c.execute(TransactionLog.create_table_sql())

    # 创建余额缓存表
    c.execute(WalletBalance.create_table_sql())

    db_connection.commit()
    print("✅ 交易相关表初始化完成")


# 常用查询方法
class TransactionRepository:
    """交易数据访问层"""

    def __init__(self, db_connection):
        self.conn = db_connection

    def get_by_hash(self, tx_hash: str) -> Optional[Transaction]:
        """根据哈希查询交易"""
        c = self.conn.cursor()
        c.execute('SELECT * FROM transactions WHERE tx_hash = ?', (tx_hash,))
        row = c.fetchone()
        return Transaction.from_db_row(row) if row else None

    def get_by_user(
        self,
        user_id: int,
        tx_type: Optional[TransactionType] = None,
        status: Optional[TransactionStatus] = None,
        limit: int = 20,
        offset: int = 0
    ) -> list:
        """查询用户交易"""
        c = self.conn.cursor()

        conditions = ['user_id = ?']
        params = [user_id]

        if tx_type:
            conditions.append('type = ?')
            params.append(tx_type.value)
        if status:
            conditions.append('status = ?')
            params.append(status.value)

        where_clause = ' AND '.join(conditions)

        c.execute(f'''
            SELECT * FROM transactions
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', params + [limit, offset])

        return [Transaction.from_db_row(row) for row in c.fetchall()]

    def update_status(
        self,
        tx_hash: str,
        new_status: TransactionStatus,
        operator: Optional[int] = None,
        reason: Optional[str] = None
    ) -> bool:
        """更新交易状态"""
        c = self.conn.cursor()

        # 获取当前状态
        c.execute('SELECT status FROM transactions WHERE tx_hash = ?', (tx_hash,))
        row = c.fetchone()
        if not row:
            return False

        from_status = TransactionStatus(row[0])

        # 更新交易
        c.execute('''
            UPDATE transactions
            SET status = ?, updated_at = ?
            WHERE tx_hash = ?
        ''', (new_status.value, datetime.now(), tx_hash))

        # 记录日志
        c.execute('''
            INSERT INTO transaction_logs
            (tx_hash, from_status, to_status, operator, reason, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (tx_hash, from_status.value, new_status.value, operator, reason, datetime.now()))

        self.conn.commit()
        return True

    def get_pending_withdrawals(self, chain_type: Optional[str] = None) -> list:
        """获取待处理提款"""
        c = self.conn.cursor()

        if chain_type:
            c.execute('''
                SELECT * FROM transactions
                WHERE type = 'withdrawal' AND status = 'pending' AND chain_type = ?
                ORDER BY created_at ASC
            ''', (chain_type,))
        else:
            c.execute('''
                SELECT * FROM transactions
                WHERE type = 'withdrawal' AND status = 'pending'
                ORDER BY created_at ASC
            ''')

        return [Transaction.from_db_row(row) for row in c.fetchall()]

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """获取用户交易统计"""
        c = self.conn.cursor()

        # 总充值
        c.execute('''
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE user_id = ? AND type = 'deposit' AND status = 'confirmed'
        ''', (user_id,))
        total_deposit = c.fetchone()[0]

        # 总提款
        c.execute('''
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE user_id = ? AND type = 'withdrawal' AND status = 'confirmed'
        ''', (user_id,))
        total_withdrawal = c.fetchone()[0]

        # 总消费
        c.execute('''
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE user_id = ? AND type = 'game_purchase' AND status = 'confirmed'
        ''', (user_id,))
        total_spent = c.fetchone()[0]

        # 待处理提款数
        c.execute('''
            SELECT COUNT(*) FROM transactions
            WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending'
        ''', (user_id,))
        pending_withdrawals = c.fetchone()[0]

        return {
            'total_deposit': float(total_deposit),
            'total_withdrawal': float(total_withdrawal),
            'total_spent': float(total_spent),
            'pending_withdrawals': pending_withdrawals,
            'net_flow': float(total_deposit) - float(total_withdrawal) - float(total_spent)
        }
