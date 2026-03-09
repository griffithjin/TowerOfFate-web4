"""
命运塔 V2.0 - Web4.0 支付服务
功能：多链支付处理、汇率转换、手续费计算
"""

from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
from enum import Enum
import requests
import json


class ChainType(Enum):
    """支持的链类型"""
    ETHEREUM = "ethereum"
    BSC = "bsc"
    POLYGON = "polygon"
    ARBITRUM = "arbitrum"
    OPTIMISM = "optimism"
    BASE = "base"


class CurrencyType(Enum):
    """支持的货币类型"""
    ETH = "ETH"
    BNB = "BNB"
    MATIC = "MATIC"
    USDT = "USDT"
    USDC = "USDC"
    DAI = "DAI"
    DIAMOND = "DIAMOND"  # 游戏内钻石
    GOLD = "GOLD"        # 游戏内金币


class PaymentService:
    """
    支付服务类
    处理多链支付、汇率转换、手续费计算
    """

    # 链配置
    CHAIN_CONFIG = {
        ChainType.ETHEREUM: {
            'name': 'Ethereum',
            'native_currency': CurrencyType.ETH,
            'decimals': 18,
            'block_time': 12,
            'confirmations': 12,
            'gas_token': 'ETH'
        },
        ChainType.BSC: {
            'name': 'BNB Chain',
            'native_currency': CurrencyType.BNB,
            'decimals': 18,
            'block_time': 3,
            'confirmations': 15,
            'gas_token': 'BNB'
        },
        ChainType.POLYGON: {
            'name': 'Polygon',
            'native_currency': CurrencyType.MATIC,
            'decimals': 18,
            'block_time': 2,
            'confirmations': 20,
            'gas_token': 'MATIC'
        },
        ChainType.ARBITRUM: {
            'name': 'Arbitrum',
            'native_currency': CurrencyType.ETH,
            'decimals': 18,
            'block_time': 0.25,
            'confirmations': 12,
            'gas_token': 'ETH'
        },
        ChainType.OPTIMISM: {
            'name': 'Optimism',
            'native_currency': CurrencyType.ETH,
            'decimals': 18,
            'block_time': 2,
            'confirmations': 12,
            'gas_token': 'ETH'
        },
        ChainType.BASE: {
            'name': 'Base',
            'native_currency': CurrencyType.ETH,
            'decimals': 18,
            'block_time': 2,
            'confirmations': 12,
            'gas_token': 'ETH'
        }
    }

    # 代币合约地址配置
    TOKEN_CONTRACTS = {
        ChainType.ETHEREUM: {
            CurrencyType.USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            CurrencyType.USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            CurrencyType.DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F'
        },
        ChainType.BSC: {
            CurrencyType.USDT: '0x55d398326f99059fF775485246999027B3197955',
            CurrencyType.USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
        },
        ChainType.POLYGON: {
            CurrencyType.USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            CurrencyType.USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            CurrencyType.DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
        }
    }

    # 手续费配置 (百分比)
    FEE_CONFIG = {
        'deposit': {
            'percentage': 0.0,  # 充值免手续费
            'min_fee': 0.0,
            'max_fee': 0.0
        },
        'withdrawal': {
            'percentage': 0.01,  # 提款1%
            'min_fee': 0.001,    # 最低0.001 ETH等值
            'max_fee': 10.0      # 最高10 ETH等值
        },
        'swap': {
            'percentage': 0.003,  # 兑换0.3%
            'min_fee': 0.0,
            'max_fee': 0.0
        }
    }

    # 游戏内货币汇率 (相对于USD)
    GAME_CURRENCY_RATES = {
        CurrencyType.DIAMOND: 0.01,   # 1钻石 = $0.01
        CurrencyType.GOLD: 0.0001     # 1金币 = $0.0001
    }

    def __init__(self, price_api_key: Optional[str] = None):
        """
        初始化支付服务

        Args:
            price_api_key: 价格API密钥 (CoinGecko, CoinMarketCap等)
        """
        self.price_api_key = price_api_key
        self._price_cache: Dict[str, Tuple[float, datetime]] = {}
        self._cache_duration = timedelta(minutes=5)

    def _get_cached_price(self, currency: str) -> Optional[float]:
        """获取缓存的价格"""
        if currency in self._price_cache:
            price, timestamp = self._price_cache[currency]
            if datetime.now() - timestamp < self._cache_duration:
                return price
        return None

    def _set_cached_price(self, currency: str, price: float):
        """设置缓存价格"""
        self._price_cache[currency] = (price, datetime.now())

    def get_token_price(self, currency: CurrencyType) -> float:
        """
        获取代币当前价格 (USD)

        Args:
            currency: 货币类型

        Returns:
            美元价格
        """
        # 检查缓存
        cached = self._get_cached_price(currency.value)
        if cached:
            return cached

        # 游戏内货币直接返回
        if currency in self.GAME_CURRENCY_RATES:
            return self.GAME_CURRENCY_RATES[currency]

        # 从API获取价格
        try:
            # 使用CoinGecko API
            coin_ids = {
                CurrencyType.ETH: 'ethereum',
                CurrencyType.BNB: 'binancecoin',
                CurrencyType.MATIC: 'polygon',
                CurrencyType.USDT: 'tether',
                CurrencyType.USDC: 'usd-coin',
                CurrencyType.DAI: 'dai'
            }

            coin_id = coin_ids.get(currency)
            if not coin_id:
                raise ValueError(f"不支持的货币: {currency}")

            url = f"https://api.coingecko.com/api/v3/simple/price"
            params = {
                'ids': coin_id,
                'vs_currencies': 'usd'
            }

            response = requests.get(url, params=params, timeout=10)
            data = response.json()

            price = data[coin_id]['usd']
            self._set_cached_price(currency.value, price)

            return price

        except Exception as e:
            # API失败时使用默认价格
            default_prices = {
                CurrencyType.ETH: 2000.0,
                CurrencyType.BNB: 300.0,
                CurrencyType.MATIC: 0.8,
                CurrencyType.USDT: 1.0,
                CurrencyType.USDC: 1.0,
                CurrencyType.DAI: 1.0
            }
            return default_prices.get(currency, 1.0)

    def convert_currency(
        self,
        amount: float,
        from_currency: CurrencyType,
        to_currency: CurrencyType
    ) -> Dict:
        """
        货币转换

        Args:
            amount: 金额
            from_currency: 源货币
            to_currency: 目标货币

        Returns:
            转换结果
        """
        if from_currency == to_currency:
            return {
                'amount': amount,
                'rate': 1.0,
                'from_currency': from_currency.value,
                'to_currency': to_currency.value
            }

        # 获取价格
        from_price = self.get_token_price(from_currency)
        to_price = self.get_token_price(to_currency)

        # 计算汇率和转换金额
        rate = from_price / to_price
        converted_amount = amount * rate

        return {
            'amount': round(converted_amount, 8),
            'rate': round(rate, 8),
            'from_price_usd': from_price,
            'to_price_usd': to_price,
            'from_currency': from_currency.value,
            'to_currency': to_currency.value,
            'timestamp': datetime.now().isoformat()
        }

    def calculate_withdrawal_fee(
        self,
        chain_type: ChainType,
        currency: CurrencyType,
        amount: float
    ) -> Dict:
        """
        计算提款手续费

        Args:
            chain_type: 链类型
            currency: 货币类型
            amount: 提款金额

        Returns:
            手续费详情
        """
        fee_config = self.FEE_CONFIG['withdrawal']

        # 计算百分比费用
        percentage_fee = amount * fee_config['percentage']

        # 获取货币价格用于计算最低/最高费用
        price_usd = self.get_token_price(currency)

        # 计算最低费用对应的代币数量
        min_fee_tokens = fee_config['min_fee'] / price_usd if price_usd > 0 else 0
        max_fee_tokens = fee_config['max_fee'] / price_usd if price_usd > 0 else float('inf')

        # 应用限制
        fee = max(percentage_fee, min_fee_tokens)
        fee = min(fee, max_fee_tokens)

        # 网络Gas费估算
        gas_estimate = self.estimate_gas_fee(chain_type, currency)

        return {
            'amount': amount,
            'fee': round(fee, 8),
            'fee_percentage': fee_config['percentage'] * 100,
            'fee_usd': round(fee * price_usd, 2),
            'gas_estimate': gas_estimate,
            'total_deduction': round(fee + gas_estimate['gas_in_token'], 8),
            'receive_amount': round(amount - fee - gas_estimate['gas_in_token'], 8),
            'currency': currency.value,
            'chain': chain_type.value
        }

    def estimate_gas_fee(
        self,
        chain_type: ChainType,
        currency: CurrencyType,
        operation: str = "transfer"
    ) -> Dict:
        """
        估算Gas费用

        Args:
            chain_type: 链类型
            currency: 货币类型
            operation: 操作类型 (transfer, contract_interaction等)

        Returns:
            Gas费用估算
        """
        # Gas限制配置
        gas_limits = {
            'transfer': 21000,
            'erc20_transfer': 65000,
            'contract_interaction': 100000,
            'nft_transfer': 80000
        }

        gas_limit = gas_limits.get(operation, 21000)

        # 各链平均Gas价格 (Gwei)
        avg_gas_prices = {
            ChainType.ETHEREUM: 30,
            ChainType.BSC: 5,
            ChainType.POLYGON: 100,
            ChainType.ARBITRUM: 0.1,
            ChainType.OPTIMISM: 0.001,
            ChainType.BASE: 0.1
        }

        gas_price_gwei = avg_gas_prices.get(chain_type, 20)

        # 计算Gas费用 (ETH单位)
        gas_fee_eth = (gas_limit * gas_price_gwei) / 1e9

        # 转换为当前链的gas代币
        chain_config = self.CHAIN_CONFIG[chain_type]
        gas_token = chain_config['gas_token']

        # 获取gas代币价格
        gas_token_price = self.get_token_price(CurrencyType(gas_token))
        gas_fee_usd = gas_fee_eth * gas_token_price

        return {
            'gas_limit': gas_limit,
            'gas_price_gwei': gas_price_gwei,
            'gas_in_token': round(gas_fee_eth, 8),
            'gas_token': gas_token,
            'gas_usd': round(gas_fee_usd, 4),
            'chain': chain_type.value,
            'operation': operation
        }

    def get_deposit_address(self, chain_type: ChainType) -> str:
        """
        获取链的充值地址

        Args:
            chain_type: 链类型

        Returns:
            充值地址
        """
        platform_addresses = {
            ChainType.ETHEREUM: '0x1234567890123456789012345678901234567890',
            ChainType.BSC: '0x1234567890123456789012345678901234567890',
            ChainType.POLYGON: '0x1234567890123456789012345678901234567890',
            ChainType.ARBITRUM: '0x1234567890123456789012345678901234567890',
            ChainType.OPTIMISM: '0x1234567890123456789012345678901234567890',
            ChainType.BASE: '0x1234567890123456789012345678901234567890'
        }
        return platform_addresses.get(chain_type, '')

    def get_supported_chains(self) -> List[Dict]:
        """获取支持的链列表"""
        chains = []
        for chain_type, config in self.CHAIN_CONFIG.items():
            chains.append({
                'id': chain_type.value,
                'name': config['name'],
                'native_currency': config['native_currency'].value,
                'confirmations': config['confirmations'],
                'block_time': config['block_time'],
                'deposit_address': self.get_deposit_address(chain_type)
            })
        return chains

    def get_supported_tokens(self, chain_type: ChainType) -> List[Dict]:
        """获取链支持的代币列表"""
        tokens = []

        # 原生代币
        chain_config = self.CHAIN_CONFIG[chain_type]
        native = chain_config['native_currency']
        tokens.append({
            'symbol': native.value,
            'name': native.value,
            'type': 'native',
            'contract': None,
            'decimals': chain_config['decimals']
        })

        # ERC20代币
        erc20_tokens = self.TOKEN_CONTRACTS.get(chain_type, {})
        for currency, contract in erc20_tokens.items():
            tokens.append({
                'symbol': currency.value,
                'name': currency.value,
                'type': 'erc20',
                'contract': contract,
                'decimals': 6 if currency in [CurrencyType.USDT, CurrencyType.USDC] else 18
            })

        return tokens

    def validate_amount(
        self,
        amount: float,
        currency: CurrencyType,
        chain_type: ChainType,
        operation: str = "deposit"
    ) -> Dict:
        """
        验证金额是否合法

        Args:
            amount: 金额
            currency: 货币
            chain_type: 链类型
            operation: 操作类型

        Returns:
            验证结果
        """
        # 最小金额限制
        min_amounts = {
            CurrencyType.ETH: 0.001,
            CurrencyType.BNB: 0.01,
            CurrencyType.MATIC: 1.0,
            CurrencyType.USDT: 1.0,
            CurrencyType.USDC: 1.0,
            CurrencyType.DAI: 1.0
        }

        min_amount = min_amounts.get(currency, 0.001)

        if amount < min_amount:
            return {
                'valid': False,
                'error': f'最小{operation}金额为 {min_amount} {currency.value}'
            }

        # 最大金额限制 (根据操作类型)
        max_amounts = {
            'deposit': 1000000,  # 充值无限制
            'withdrawal': 100    # 提款限制
        }

        max_amount = max_amounts.get(operation, float('inf'))

        if amount > max_amount:
            return {
                'valid': False,
                'error': f'最大{operation}金额为 {max_amount} {currency.value}'
            }

        return {'valid': True}

    def get_wallet_balances(
        self,
        wallet_address: str,
        chain_type: str
    ) -> Dict[str, float]:
        """
        获取钱包余额 (模拟实现)

        Args:
            wallet_address: 钱包地址
            chain_type: 链类型

        Returns:
            各代币余额
        """
        # TODO: 实际实现需要调用Web3或区块链API
        # 这里返回模拟数据
        return {
            'ETH': 1.5,
            'USDT': 1000.0,
            'USDC': 500.0
        }

    def create_payment_session(
        self,
        user_id: int,
        amount: float,
        currency: CurrencyType,
        chain_type: ChainType,
        item_id: Optional[str] = None,
        item_name: Optional[str] = None
    ) -> Dict:
        """
        创建支付会话

        Args:
            user_id: 用户ID
            amount: 金额
            currency: 货币
            chain_type: 链类型
            item_id: 商品ID
            item_name: 商品名称

        Returns:
            支付会话信息
        """
        import hashlib
        import uuid

        # 生成会话ID
        session_id = f"PAY-{uuid.uuid4().hex[:16].upper()}"

        # 获取充值地址
        deposit_address = self.get_deposit_address(chain_type)

        # 计算过期时间
        expires_at = datetime.now() + timedelta(hours=1)

        # 验证金额
        validation = self.validate_amount(amount, currency, chain_type, 'deposit')
        if not validation['valid']:
            return {'error': validation['error']}

        # 获取代币合约地址
        token_contract = None
        if currency != self.CHAIN_CONFIG[chain_type]['native_currency']:
            token_contract = self.TOKEN_CONTRACTS.get(chain_type, {}).get(currency)

        return {
            'session_id': session_id,
            'user_id': user_id,
            'amount': amount,
            'currency': currency.value,
            'chain': chain_type.value,
            'deposit_address': deposit_address,
            'token_contract': token_contract,
            'item_id': item_id,
            'item_name': item_name,
            'status': 'pending',
            'created_at': datetime.now().isoformat(),
            'expires_at': expires_at.isoformat()
        }

    def get_exchange_rates(self, base_currency: CurrencyType = CurrencyType.USDT) -> Dict:
        """
        获取汇率列表

        Args:
            base_currency: 基准货币

        Returns:
            汇率列表
        """
        rates = {}
        base_price = self.get_token_price(base_currency)

        for currency in CurrencyType:
            if currency != base_currency:
                price = self.get_token_price(currency)
                rate = base_price / price if price > 0 else 0
                rates[currency.value] = {
                    'rate': round(rate, 8),
                    'price_usd': price
                }

        return {
            'base': base_currency.value,
            'timestamp': datetime.now().isoformat(),
            'rates': rates
        }
