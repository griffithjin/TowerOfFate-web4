"""
命运塔 V2.0 - Web4.0 NFT数据模型
包含：NFT持有记录、交易历史、元数据缓存
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
import json


class NFTType(Enum):
    """NFT类型"""
    TOWER = "tower"           # 命运塔
    CARD = "card"             # 卡牌皮肤
    AVATAR = "avatar"         # 头像
    BADGE = "badge"           # 徽章
    EFFECT = "effect"         # 特效
    TITLE = "title"           # 称号


class NFTStatus(Enum):
    """NFT状态"""
    OWNED = "owned"           # 持有中
    LISTED = "listed"         # 上架中
    LOCKED = "locked"         # 锁定中（游戏中使用）
    BURNED = "burned"         # 已销毁


class NFT:
    """
    NFT基础模型

    数据库表: nfts
    """

    def __init__(
        self,
        token_id: str,
        contract_address: str,
        chain_type: str,
        nft_type: NFTType,
        name: str,
        description: Optional[str] = None,
        image_url: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None,
        metadata_uri: Optional[str] = None,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        self.token_id = token_id
        self.contract_address = contract_address.lower()
        self.chain_type = chain_type
        self.nft_type = nft_type
        self.name = name
        self.description = description
        self.image_url = image_url
        self.attributes = attributes or {}
        self.metadata_uri = metadata_uri
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at or datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'token_id': self.token_id,
            'contract_address': self.contract_address,
            'chain_type': self.chain_type,
            'type': self.nft_type.value,
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'attributes': self.attributes,
            'metadata_uri': self.metadata_uri,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @classmethod
    def from_db_row(cls, row: tuple) -> 'NFT':
        """从数据库行创建实例"""
        return cls(
            token_id=row[1],
            contract_address=row[2],
            chain_type=row[3],
            nft_type=NFTType(row[4]),
            name=row[5],
            description=row[6],
            image_url=row[7],
            attributes=json.loads(row[8]) if row[8] else {},
            metadata_uri=row[9],
            created_at=datetime.fromisoformat(row[10]) if row[10] else None,
            updated_at=datetime.fromisoformat(row[11]) if row[11] else None
        )

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS nfts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT NOT NULL,
            contract_address TEXT NOT NULL,
            chain_type TEXT NOT NULL DEFAULT 'ethereum',
            type TEXT NOT NULL DEFAULT 'tower',
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            attributes TEXT,  -- JSON格式
            metadata_uri TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(token_id, contract_address, chain_type)
        );

        CREATE INDEX IF NOT EXISTS idx_nfts_contract ON nfts(contract_address);
        CREATE INDEX IF NOT EXISTS idx_nfts_type ON nfts(type);
        CREATE INDEX IF NOT EXISTS idx_nfts_chain ON nfts(chain_type);
        """


class NFTOwnership:
    """
    NFT持有记录模型

    数据库表: nft_ownerships
    """

    def __init__(
        self,
        token_id: str,
        contract_address: str,
        chain_type: str,
        user_id: int,
        wallet_address: str,
        status: NFTStatus = NFTStatus.OWNED,
        acquired_at: Optional[datetime] = None,
        acquired_price: Optional[float] = None,
        acquired_currency: str = "ETH",
        listed_price: Optional[float] = None,
        listed_currency: Optional[str] = None,
        listed_at: Optional[datetime] = None,
        is_equipped: bool = False,
        equipped_slot: Optional[str] = None
    ):
        self.token_id = token_id
        self.contract_address = contract_address.lower()
        self.chain_type = chain_type
        self.user_id = user_id
        self.wallet_address = wallet_address.lower()
        self.status = status
        self.acquired_at = acquired_at or datetime.now()
        self.acquired_price = acquired_price
        self.acquired_currency = acquired_currency
        self.listed_price = listed_price
        self.listed_currency = listed_currency
        self.listed_at = listed_at
        self.is_equipped = is_equipped
        self.equipped_slot = equipped_slot

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'token_id': self.token_id,
            'contract_address': self.contract_address,
            'chain_type': self.chain_type,
            'user_id': self.user_id,
            'wallet_address': self.wallet_address,
            'status': self.status.value,
            'acquired_at': self.acquired_at.isoformat() if self.acquired_at else None,
            'acquired_price': self.acquired_price,
            'acquired_currency': self.acquired_currency,
            'listed_price': self.listed_price,
            'listed_currency': self.listed_currency,
            'listed_at': self.listed_at.isoformat() if self.listed_at else None,
            'is_equipped': self.is_equipped,
            'equipped_slot': self.equipped_slot
        }

    @classmethod
    def from_db_row(cls, row: tuple) -> 'NFTOwnership':
        """从数据库行创建实例"""
        return cls(
            token_id=row[1],
            contract_address=row[2],
            chain_type=row[3],
            user_id=row[4],
            wallet_address=row[5],
            status=NFTStatus(row[6]),
            acquired_at=datetime.fromisoformat(row[7]) if row[7] else None,
            acquired_price=row[8],
            acquired_currency=row[9] or "ETH",
            listed_price=row[10],
            listed_currency=row[11],
            listed_at=datetime.fromisoformat(row[12]) if row[12] else None,
            is_equipped=bool(row[13]),
            equipped_slot=row[14]
        )

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS nft_ownerships (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT NOT NULL,
            contract_address TEXT NOT NULL,
            chain_type TEXT NOT NULL DEFAULT 'ethereum',
            user_id INTEGER NOT NULL,
            wallet_address TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'owned',
            acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            acquired_price REAL,
            acquired_currency TEXT DEFAULT 'ETH',
            listed_price REAL,
            listed_currency TEXT,
            listed_at TIMESTAMP,
            is_equipped BOOLEAN DEFAULT 0,
            equipped_slot TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (token_id, contract_address, chain_type)
                REFERENCES nfts(token_id, contract_address, chain_type),
            UNIQUE(token_id, contract_address, chain_type)
        );

        CREATE INDEX IF NOT EXISTS idx_nft_owner_user ON nft_ownerships(user_id);
        CREATE INDEX IF NOT EXISTS idx_nft_owner_status ON nft_ownerships(status);
        CREATE INDEX IF NOT EXISTS idx_nft_owner_wallet ON nft_ownerships(wallet_address);
        """


class NFTTransaction:
    """
    NFT交易历史模型

    数据库表: nft_transactions
    """

    def __init__(
        self,
        tx_hash: str,
        token_id: str,
        contract_address: str,
        chain_type: str,
        from_user_id: Optional[int] = None,
        from_wallet: Optional[str] = None,
        to_user_id: Optional[int] = None,
        to_wallet: Optional[str] = None,
        tx_type: str = "transfer",  # transfer, mint, burn, sale
        price: Optional[float] = None,
        currency: Optional[str] = None,
        marketplace: Optional[str] = None,
        created_at: Optional[datetime] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.tx_hash = tx_hash
        self.token_id = token_id
        self.contract_address = contract_address.lower()
        self.chain_type = chain_type
        self.from_user_id = from_user_id
        self.from_wallet = from_wallet.lower() if from_wallet else None
        self.to_user_id = to_user_id
        self.to_wallet = to_wallet.lower() if to_wallet else None
        self.tx_type = tx_type
        self.price = price
        self.currency = currency
        self.marketplace = marketplace
        self.created_at = created_at or datetime.now()
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'tx_hash': self.tx_hash,
            'token_id': self.token_id,
            'contract_address': self.contract_address,
            'chain_type': self.chain_type,
            'from_user_id': self.from_user_id,
            'from_wallet': self.from_wallet,
            'to_user_id': self.to_user_id,
            'to_wallet': self.to_wallet,
            'type': self.tx_type,
            'price': self.price,
            'currency': self.currency,
            'marketplace': self.marketplace,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'metadata': self.metadata
        }

    @classmethod
    def from_db_row(cls, row: tuple) -> 'NFTTransaction':
        """从数据库行创建实例"""
        return cls(
            tx_hash=row[1],
            token_id=row[2],
            contract_address=row[3],
            chain_type=row[4],
            from_user_id=row[5],
            from_wallet=row[6],
            to_user_id=row[7],
            to_wallet=row[8],
            tx_type=row[9],
            price=row[10],
            currency=row[11],
            marketplace=row[12],
            created_at=datetime.fromisoformat(row[13]) if row[13] else None,
            metadata=json.loads(row[14]) if row[14] else {}
        )

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS nft_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tx_hash TEXT NOT NULL,
            token_id TEXT NOT NULL,
            contract_address TEXT NOT NULL,
            chain_type TEXT NOT NULL DEFAULT 'ethereum',
            from_user_id INTEGER,
            from_wallet TEXT,
            to_user_id INTEGER,
            to_wallet TEXT,
            type TEXT NOT NULL DEFAULT 'transfer',
            price REAL,
            currency TEXT,
            marketplace TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT,  -- JSON格式
            FOREIGN KEY (token_id, contract_address, chain_type)
                REFERENCES nfts(token_id, contract_address, chain_type)
        );

        CREATE INDEX IF NOT EXISTS idx_nft_tx_hash ON nft_transactions(tx_hash);
        CREATE INDEX IF NOT EXISTS idx_nft_tx_token ON nft_transactions(token_id);
        CREATE INDEX IF NOT EXISTS idx_nft_tx_from ON nft_transactions(from_user_id);
        CREATE INDEX IF NOT EXISTS idx_nft_tx_to ON nft_transactions(to_user_id);
        CREATE INDEX IF NOT EXISTS idx_nft_tx_type ON nft_transactions(type);
        """


class NFTMetadataCache:
    """
    NFT元数据缓存模型
    用于缓存从IPFS/链上获取的NFT元数据

    数据库表: nft_metadata_cache
    """

    def __init__(
        self,
        token_id: str,
        contract_address: str,
        chain_type: str,
        raw_metadata: Dict[str, Any],
        fetched_at: Optional[datetime] = None,
        expires_at: Optional[datetime] = None,
        source: str = "onchain",
        retry_count: int = 0
    ):
        self.token_id = token_id
        self.contract_address = contract_address.lower()
        self.chain_type = chain_type
        self.raw_metadata = raw_metadata
        self.fetched_at = fetched_at or datetime.now()
        # 默认缓存7天
        self.expires_at = expires_at or datetime.fromtimestamp(
            self.fetched_at.timestamp() + 7 * 24 * 3600
        )
        self.source = source
        self.retry_count = retry_count

    def is_expired(self) -> bool:
        """检查缓存是否过期"""
        return datetime.now() > self.expires_at

    def to_dict(self) -> Dict[str, Any]:
        """转换为字典"""
        return {
            'token_id': self.token_id,
            'contract_address': self.contract_address,
            'chain_type': self.chain_type,
            'raw_metadata': self.raw_metadata,
            'fetched_at': self.fetched_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'source': self.source,
            'retry_count': self.retry_count,
            'is_expired': self.is_expired()
        }

    @staticmethod
    def create_table_sql() -> str:
        """创建表的SQL语句"""
        return """
        CREATE TABLE IF NOT EXISTS nft_metadata_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token_id TEXT NOT NULL,
            contract_address TEXT NOT NULL,
            chain_type TEXT NOT NULL DEFAULT 'ethereum',
            raw_metadata TEXT NOT NULL,  -- JSON格式
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            source TEXT DEFAULT 'onchain',
            retry_count INTEGER DEFAULT 0,
            UNIQUE(token_id, contract_address, chain_type)
        );

        CREATE INDEX IF NOT EXISTS idx_nft_meta_expires ON nft_metadata_cache(expires_at);
        """


# 数据库初始化函数
def init_nft_tables(db_connection):
    """初始化NFT相关表"""
    c = db_connection.cursor()

    # 创建NFT基础表
    c.execute(NFT.create_table_sql())

    # 创建持有记录表
    c.execute(NFTOwnership.create_table_sql())

    # 创建交易历史表
    c.execute(NFTTransaction.create_table_sql())

    # 创建元数据缓存表
    c.execute(NFTMetadataCache.create_table_sql())

    db_connection.commit()
    print("✅ NFT相关表初始化完成")


# NFT数据访问层
class NFTRepository:
    """NFT数据访问层"""

    def __init__(self, db_connection):
        self.conn = db_connection

    def get_nft(self, token_id: str, contract_address: str, chain_type: str) -> Optional[NFT]:
        """获取NFT详情"""
        c = self.conn.cursor()
        c.execute('''
            SELECT * FROM nfts
            WHERE token_id = ? AND contract_address = ? AND chain_type = ?
        ''', (token_id, contract_address.lower(), chain_type))
        row = c.fetchone()
        return NFT.from_db_row(row) if row else None

    def get_user_nfts(
        self,
        user_id: int,
        nft_type: Optional[NFTType] = None,
        status: Optional[NFTStatus] = None
    ) -> List[Dict[str, Any]]:
        """获取用户持有的NFT列表"""
        c = self.conn.cursor()

        conditions = ['no.user_id = ?']
        params = [user_id]

        if nft_type:
            conditions.append('n.type = ?')
            params.append(nft_type.value)
        if status:
            conditions.append('no.status = ?')
            params.append(status.value)

        where_clause = ' AND '.join(conditions)

        c.execute(f'''
            SELECT n.*, no.status, no.acquired_at, no.acquired_price,
                   no.is_equipped, no.equipped_slot
            FROM nfts n
            JOIN nft_ownerships no ON n.token_id = no.token_id
                AND n.contract_address = no.contract_address
                AND n.chain_type = no.chain_type
            WHERE {where_clause}
            ORDER BY no.acquired_at DESC
        ''', params)

        results = []
        for row in c.fetchall():
            nft_data = {
                'token_id': row[1],
                'contract_address': row[2],
                'chain_type': row[3],
                'type': row[4],
                'name': row[5],
                'description': row[6],
                'image_url': row[7],
                'attributes': json.loads(row[8]) if row[8] else {},
                'status': row[12],
                'acquired_at': row[13],
                'acquired_price': row[14],
                'is_equipped': bool(row[15]),
                'equipped_slot': row[16]
            }
            results.append(nft_data)

        return results

    def get_nft_history(
        self,
        token_id: str,
        contract_address: str,
        chain_type: str,
        limit: int = 20
    ) -> List[NFTTransaction]:
        """获取NFT交易历史"""
        c = self.conn.cursor()
        c.execute('''
            SELECT * FROM nft_transactions
            WHERE token_id = ? AND contract_address = ? AND chain_type = ?
            ORDER BY created_at DESC
            LIMIT ?
        ''', (token_id, contract_address.lower(), chain_type, limit))

        return [NFTTransaction.from_db_row(row) for row in c.fetchall()]

    def get_metadata_cache(
        self,
        token_id: str,
        contract_address: str,
        chain_type: str
    ) -> Optional[NFTMetadataCache]:
        """获取元数据缓存"""
        c = self.conn.cursor()
        c.execute('''
            SELECT * FROM nft_metadata_cache
            WHERE token_id = ? AND contract_address = ? AND chain_type = ?
        ''', (token_id, contract_address.lower(), chain_type))
        row = c.fetchone()

        if row:
            cache = NFTMetadataCache(
                token_id=row[1],
                contract_address=row[2],
                chain_type=row[3],
                raw_metadata=json.loads(row[4]),
                fetched_at=datetime.fromisoformat(row[5]),
                expires_at=datetime.fromisoformat(row[6]),
                source=row[7],
                retry_count=row[8]
            )
            # 如果已过期，返回None触发重新获取
            if not cache.is_expired():
                return cache

        return None

    def save_metadata_cache(self, cache: NFTMetadataCache):
        """保存元数据缓存"""
        c = self.conn.cursor()
        c.execute('''
            INSERT OR REPLACE INTO nft_metadata_cache
            (token_id, contract_address, chain_type, raw_metadata,
             fetched_at, expires_at, source, retry_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            cache.token_id,
            cache.contract_address,
            cache.chain_type,
            json.dumps(cache.raw_metadata),
            cache.fetched_at,
            cache.expires_at,
            cache.source,
            cache.retry_count
        ))
        self.conn.commit()

    def equip_nft(self, user_id: int, token_id: str, contract_address: str,
                  chain_type: str, slot: str) -> bool:
        """装备NFT"""
        c = self.conn.cursor()

        # 先取消该槽位的其他装备
        c.execute('''
            UPDATE nft_ownerships
            SET is_equipped = 0, equipped_slot = NULL
            WHERE user_id = ? AND equipped_slot = ?
        ''', (user_id, slot))

        # 装备新NFT
        c.execute('''
            UPDATE nft_ownerships
            SET is_equipped = 1, equipped_slot = ?
            WHERE user_id = ? AND token_id = ?
            AND contract_address = ? AND chain_type = ?
        ''', (slot, user_id, token_id, contract_address.lower(), chain_type))

        self.conn.commit()
        return c.rowcount > 0

    def unequip_nft(self, user_id: int, token_id: str, contract_address: str,
                    chain_type: str) -> bool:
        """卸下NFT"""
        c = self.conn.cursor()
        c.execute('''
            UPDATE nft_ownerships
            SET is_equipped = 0, equipped_slot = NULL
            WHERE user_id = ? AND token_id = ?
            AND contract_address = ? AND chain_type = ?
        ''', (user_id, token_id, contract_address.lower(), chain_type))

        self.conn.commit()
        return c.rowcount > 0
