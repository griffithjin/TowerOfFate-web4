"""
命运塔 V2.0 - Web4.0 钱包管理API
功能：钱包绑定/解绑、交易历史查询、余额同步
"""

from flask import Blueprint, request, jsonify
from datetime import datetime
import re
from typing import Dict, List, Optional

wallet_bp = Blueprint('wallet', __name__, url_prefix='/api/v2/wallet')

# 支持的链类型
SUPPORTED_CHAINS = ['ethereum', 'bsc', 'polygon', 'arbitrum', 'optimism', 'base']

# 地址验证正则
ADDRESS_PATTERNS = {
    'ethereum': r'^0x[a-fA-F0-9]{40}$',
    'bsc': r'^0x[a-fA-F0-9]{40}$',
    'polygon': r'^0x[a-fA-F0-9]{40}$',
    'arbitrum': r'^0x[a-fA-F0-9]{40}$',
    'optimism': r'^0x[a-fA-F0-9]{40}$',
    'base': r'^0x[a-fA-F0-9]{40}$'
}


def validate_wallet_address(chain_type: str, address: str) -> bool:
    """验证钱包地址格式"""
    if chain_type not in ADDRESS_PATTERNS:
        return False
    pattern = ADDRESS_PATTERNS[chain_type]
    return bool(re.match(pattern, address))


def get_db_connection():
    """获取数据库连接"""
    import sqlite3
    return sqlite3.connect('toweroffate_v2.db')


@wallet_bp.route('/bind', methods=['POST'])
def bind_wallet():
    """
    绑定钱包地址
    Request: { user_id, wallet_address, chain_type, signature }
    """
    data = request.json
    user_id = data.get('user_id')
    wallet_address = data.get('wallet_address', '').lower()
    chain_type = data.get('chain_type', 'ethereum')
    signature = data.get('signature')
    is_primary = data.get('is_primary', False)

    # 参数验证
    if not all([user_id, wallet_address, signature]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    if chain_type not in SUPPORTED_CHAINS:
        return jsonify({'code': 400, 'message': f'不支持的链类型: {chain_type}'}), 400

    if not validate_wallet_address(chain_type, wallet_address):
        return jsonify({'code': 400, 'message': '钱包地址格式错误'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 检查地址是否已被其他用户绑定
        c.execute('''
            SELECT user_id FROM user_wallets
            WHERE wallet_address = ? AND chain_type = ? AND user_id != ?
        ''', (wallet_address, chain_type, user_id))
        if c.fetchone():
            return jsonify({'code': 409, 'message': '该钱包地址已被其他用户绑定'}), 409

        # 检查是否已绑定
        c.execute('''
            SELECT id FROM user_wallets
            WHERE user_id = ? AND wallet_address = ? AND chain_type = ?
        ''', (user_id, wallet_address, chain_type))
        if c.fetchone():
            return jsonify({'code': 409, 'message': '钱包地址已绑定'}), 409

        # 如果设为主钱包，先将其他钱包设为非主钱包
        if is_primary:
            c.execute('''
                UPDATE user_wallets SET is_primary = 0
                WHERE user_id = ?
            ''', (user_id,))

        # 插入新钱包
        c.execute('''
            INSERT INTO user_wallets (user_id, wallet_address, chain_type, is_primary, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_id, wallet_address, chain_type, is_primary, datetime.now()))

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '钱包绑定成功',
            'data': {
                'wallet_id': c.lastrowid,
                'wallet_address': wallet_address,
                'chain_type': chain_type,
                'is_primary': is_primary
            }
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'绑定失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/unbind', methods=['POST'])
def unbind_wallet():
    """
    解绑钱包地址
    Request: { user_id, wallet_id }
    """
    data = request.json
    user_id = data.get('user_id')
    wallet_id = data.get('wallet_id')

    if not all([user_id, wallet_id]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 验证钱包归属
        c.execute('''
            SELECT wallet_address, is_primary FROM user_wallets
            WHERE id = ? AND user_id = ?
        ''', (wallet_id, user_id))
        wallet = c.fetchone()

        if not wallet:
            return jsonify({'code': 404, 'message': '钱包不存在或无权限'}), 404

        # 检查是否有进行中的交易
        c.execute('''
            SELECT COUNT(*) FROM transactions
            WHERE user_id = ? AND wallet_address = ? AND status IN ('pending', 'processing')
        ''', (user_id, wallet[0]))
        if c.fetchone()[0] > 0:
            return jsonify({'code': 409, 'message': '该钱包有进行中的交易，无法解绑'}), 409

        # 执行解绑
        c.execute('DELETE FROM user_wallets WHERE id = ?', (wallet_id,))

        # 如果解绑的是主钱包，将最新的设为主钱包
        if wallet[1]:  # is_primary
            c.execute('''
                UPDATE user_wallets SET is_primary = 1
                WHERE user_id = ?
                ORDER BY created_at DESC LIMIT 1
            ''', (user_id,))

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '钱包解绑成功'
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'解绑失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/list', methods=['GET'])
def list_wallets():
    """
    获取用户绑定的钱包列表
    Query: user_id
    """
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'code': 400, 'message': '缺少user_id参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute('''
            SELECT id, wallet_address, chain_type, is_primary, created_at
            FROM user_wallets
            WHERE user_id = ?
            ORDER BY is_primary DESC, created_at DESC
        ''', (user_id,))

        wallets = []
        for row in c.fetchall():
            wallets.append({
                'wallet_id': row[0],
                'wallet_address': row[1],
                'chain_type': row[2],
                'is_primary': bool(row[3]),
                'created_at': row[4]
            })

        return jsonify({
            'code': 200,
            'data': {
                'total': len(wallets),
                'wallets': wallets
            }
        })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'查询失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/set-primary', methods=['POST'])
def set_primary_wallet():
    """
    设置主钱包
    Request: { user_id, wallet_id }
    """
    data = request.json
    user_id = data.get('user_id')
    wallet_id = data.get('wallet_id')

    if not all([user_id, wallet_id]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 验证钱包归属
        c.execute('''
            SELECT wallet_address FROM user_wallets
            WHERE id = ? AND user_id = ?
        ''', (wallet_id, user_id))
        if not c.fetchone():
            return jsonify({'code': 404, 'message': '钱包不存在或无权限'}), 404

        # 先将所有钱包设为非主钱包
        c.execute('''
            UPDATE user_wallets SET is_primary = 0
            WHERE user_id = ?
        ''', (user_id,))

        # 设置指定钱包为主钱包
        c.execute('''
            UPDATE user_wallets SET is_primary = 1
            WHERE id = ? AND user_id = ?
        ''', (wallet_id, user_id))

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '主钱包设置成功'
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'code': 500, 'message': f'设置失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/transactions', methods=['GET'])
def get_transaction_history():
    """
    获取交易历史
    Query: user_id, wallet_address(可选), type(可选), page, limit
    """
    user_id = request.args.get('user_id')
    wallet_address = request.args.get('wallet_address')
    tx_type = request.args.get('type')  # deposit, withdrawal, game_purchase
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    offset = (page - 1) * limit

    if not user_id:
        return jsonify({'code': 400, 'message': '缺少user_id参数'}), 400

    conn = get_db_connection()
    c = conn.cursor()

    try:
        # 构建查询条件
        conditions = ['user_id = ?']
        params = [user_id]

        if wallet_address:
            conditions.append('wallet_address = ?')
            params.append(wallet_address.lower())
        if tx_type:
            conditions.append('type = ?')
            params.append(tx_type)

        where_clause = ' AND '.join(conditions)

        # 查询总数
        c.execute(f'''
            SELECT COUNT(*) FROM transactions WHERE {where_clause}
        ''', params)
        total = c.fetchone()[0]

        # 查询交易记录
        c.execute(f'''
            SELECT tx_hash, wallet_address, type, currency, amount,
                   status, chain_type, created_at, confirmed_at, description
            FROM transactions
            WHERE {where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ''', params + [limit, offset])

        transactions = []
        for row in c.fetchall():
            transactions.append({
                'tx_hash': row[0],
                'wallet_address': row[1],
                'type': row[2],
                'currency': row[3],
                'amount': row[4],
                'status': row[5],
                'chain_type': row[6],
                'created_at': row[7],
                'confirmed_at': row[8],
                'description': row[9]
            })

        return jsonify({
            'code': 200,
            'data': {
                'total': total,
                'page': page,
                'limit': limit,
                'transactions': transactions
            }
        })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'查询失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/balance/sync', methods=['POST'])
def sync_balance():
    """
    同步钱包余额
    Request: { user_id, wallet_address, chain_type }
    从链上获取最新余额并更新
    """
    data = request.json
    user_id = data.get('user_id')
    wallet_address = data.get('wallet_address', '').lower()
    chain_type = data.get('chain_type', 'ethereum')

    if not all([user_id, wallet_address]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

    # 验证钱包归属
    conn = get_db_connection()
    c = conn.cursor()

    try:
        c.execute('''
            SELECT id FROM user_wallets
            WHERE user_id = ? AND wallet_address = ? AND chain_type = ?
        ''', (user_id, wallet_address, chain_type))

        if not c.fetchone():
            return jsonify({'code': 404, 'message': '钱包不存在或无权限'}), 404

        # TODO: 调用区块链服务获取实际余额
        # 这里模拟从链上获取余额
        from services.payment_service import PaymentService
        payment_service = PaymentService()
        balances = payment_service.get_wallet_balances(wallet_address, chain_type)

        # 更新余额缓存
        c.execute('''
            INSERT OR REPLACE INTO wallet_balances
            (wallet_address, chain_type, balances, updated_at)
            VALUES (?, ?, ?, ?)
        ''', (wallet_address, chain_type, str(balances), datetime.now()))

        conn.commit()

        return jsonify({
            'code': 200,
            'message': '余额同步成功',
            'data': {
                'wallet_address': wallet_address,
                'chain_type': chain_type,
                'balances': balances,
                'synced_at': datetime.now().isoformat()
            }
        })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'同步失败: {str(e)}'}), 500
    finally:
        conn.close()


@wallet_bp.route('/balance', methods=['GET'])
def get_balance():
    """
    获取钱包余额（从缓存）
    Query: user_id, wallet_address, chain_type
    """
    user_id = request.args.get('user_id')
    wallet_address = request.args.get('wallet_address', '').lower()
    chain_type = request.args.get('chain_type', 'ethereum')

    if not all([user_id, wallet_address]):
        return jsonify({'code': 400, 'message': '缺少必要参数'}), 400

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

        # 查询缓存余额
        c.execute('''
            SELECT balances, updated_at FROM wallet_balances
            WHERE wallet_address = ? AND chain_type = ?
        ''', (wallet_address, chain_type))

        row = c.fetchone()
        if row:
            import json
            balances = json.loads(row[0].replace("'", '"'))
            return jsonify({
                'code': 200,
                'data': {
                    'wallet_address': wallet_address,
                    'chain_type': chain_type,
                    'balances': balances,
                    'cached_at': row[1],
                    'is_cached': True
                }
            })
        else:
            # 无缓存，返回空并建议同步
            return jsonify({
                'code': 200,
                'data': {
                    'wallet_address': wallet_address,
                    'chain_type': chain_type,
                    'balances': {},
                    'is_cached': False,
                    'message': '余额未缓存，请调用同步接口'
                }
            })

    except Exception as e:
        return jsonify({'code': 500, 'message': f'查询失败: {str(e)}'}), 500
    finally:
        conn.close()
