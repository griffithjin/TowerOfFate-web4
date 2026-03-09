/**
 * Cards3D - 3D卡牌系统
 * 卡牌模型、翻转动画、出牌动画、手牌排列
 */

import * as THREE from 'three';

export class Cards3D {
    constructor(sceneManager, options = {}) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        this.camera = sceneManager.getCamera();
        this.renderer = sceneManager.getRenderer();

        this.isMobile = window.innerWidth < 768;
        this.cards = [];
        this.selectedCard = null;
        this.hoveredCard = null;

        this.onCardClick = options.onCardClick || (() => {});
        this.onCardPlay = options.onCardPlay || (() => {});

        // 卡牌配置
        this.cardConfig = {
            width: this.isMobile ? 1.2 : 1.5,
            height: this.isMobile ? 1.8 : 2.2,
            thickness: 0.05,
            fanRadius: this.isMobile ? 4 : 6,
            fanAngle: Math.PI / 3
        };

        this.cardGroup = new THREE.Group();
        this.scene.add(this.cardGroup);

        this.initMaterials();
        this.initInteraction();
    }

    /**
     * 初始化材质
     */
    initMaterials() {
        // 卡牌背面材质
        this.backMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.6,
            roughness: 0.4,
            map: this.createCardBackTexture()
        });

        // 卡牌边框材质
        this.edgeMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.9,
            roughness: 0.1
        });

        // 卡牌正面材质缓存
        this.frontMaterials = new Map();
    }

    /**
     * 创建卡牌背面纹理
     */
    createCardBackTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        // 背景
        const gradient = ctx.createLinearGradient(0, 0, 256, 384);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 384);

        // 边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 8;
        ctx.strokeRect(10, 10, 236, 364);

        // 装饰图案
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = 128 + Math.cos(angle) * 80;
            const y = 192 + Math.sin(angle) * 120;
            ctx.beginPath();
            ctx.arc(x, y, 30, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 中心图案
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(128, 132);
        ctx.lineTo(148, 172);
        ctx.lineTo(192, 172);
        ctx.lineTo(156, 200);
        ctx.lineTo(168, 244);
        ctx.lineTo(128, 220);
        ctx.lineTo(88, 244);
        ctx.lineTo(100, 200);
        ctx.lineTo(64, 172);
        ctx.lineTo(108, 172);
        ctx.closePath();
        ctx.fill();

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    /**
     * 创建卡牌正面纹理
     */
    createCardFrontTexture(cardData) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');

        // 背景
        const gradient = ctx.createLinearGradient(0, 0, 256, 384);
        const colorMap = {
            'attack': ['#8B0000', '#4a0000'],
            'defense': ['#00008B', '#00004a'],
            'magic': ['#4B0082', '#2a0048'],
            'item': ['#006400', '#003a00'],
            'special': ['#FF8C00', '#8B4500']
        };
        const colors = colorMap[cardData.type] || ['#2a2a2a', '#1a1a1a'];
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 384);

        // 边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, 240, 368);

        // 内边框
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(16, 16, 224, 352);

        // 卡牌名称背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(20, 20, 216, 40);

        // 卡牌名称
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(cardData.name || '卡牌', 128, 48);

        // 费用/等级
        if (cardData.cost !== undefined) {
            ctx.fillStyle = '#4169E1';
            ctx.beginPath();
            ctx.arc(40, 90, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 18px Arial';
            ctx.fillText(cardData.cost.toString(), 40, 96);
        }

        // 卡牌图片区域
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(30, 120, 196, 140);

        // 绘制图标
        this.drawCardIcon(ctx, cardData.type, 128, 190);

        // 描述区域
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(20, 270, 216, 90);

        // 描述文字
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        const words = (cardData.description || '').split('');
        let line = '';
        let y = 290;
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > 200 && i > 0) {
                ctx.fillText(line, 30, y);
                line = words[i];
                y += 18;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, 30, y);

        // 攻击力/防御力
        if (cardData.attack !== undefined) {
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.moveTo(40, 360);
            ctx.lineTo(55, 375);
            ctx.lineTo(25, 375);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(cardData.attack.toString(), 40, 370);
        }

        if (cardData.defense !== undefined) {
            ctx.fillStyle = '#00FF00';
            ctx.beginPath();
            ctx.arc(216, 367, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(cardData.defense.toString(), 216, 372);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }

    /**
     * 绘制卡牌图标
     */
    drawCardIcon(ctx, type, x, y) {
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';

        switch (type) {
            case 'attack':
                ctx.beginPath();
                ctx.moveTo(x, y - 30);
                ctx.lineTo(x + 25, y + 20);
                ctx.lineTo(x - 25, y + 20);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            case 'defense':
                ctx.beginPath();
                ctx.arc(x, y, 30, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            case 'magic':
                ctx.beginPath();
                ctx.moveTo(x, y - 35);
                ctx.lineTo(x + 10, y - 10);
                ctx.lineTo(x + 35, y - 5);
                ctx.lineTo(x + 15, y + 10);
                ctx.lineTo(x + 25, y + 35);
                ctx.lineTo(x, y + 20);
                ctx.lineTo(x - 25, y + 35);
                ctx.lineTo(x - 15, y + 10);
                ctx.lineTo(x - 35, y - 5);
                ctx.lineTo(x - 10, y - 10);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                break;
            default:
                ctx.beginPath();
                ctx.rect(x - 25, y - 25, 50, 50);
                ctx.fill();
                ctx.stroke();
        }
    }

    /**
     * 创建卡牌
     */
    createCard(cardData) {
        const { width, height, thickness } = this.cardConfig;

        // 卡牌几何体
        const geometry = new THREE.BoxGeometry(width, height, thickness);

        // 获取或创建正面材质
        let frontMaterial = this.frontMaterials.get(cardData.id);
        if (!frontMaterial) {
            const texture = this.createCardFrontTexture(cardData);
            frontMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                map: texture,
                metalness: 0.3,
                roughness: 0.6
            });
            this.frontMaterials.set(cardData.id, frontMaterial);
        }

        // 材质数组 [右, 左, 上, 下, 前, 后]
        const materials = [
            this.edgeMaterial, this.edgeMaterial,
            this.edgeMaterial, this.edgeMaterial,
            frontMaterial, this.backMaterial
        ];

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.userData = {
            cardId: cardData.id,
            cardData: cardData,
            isCard: true,
            originalY: 0
        };

        mesh.castShadow = !this.isMobile;
        mesh.receiveShadow = !this.isMobile;

        return {
            id: cardData.id,
            data: cardData,
            mesh: mesh,
            isFlipped: false,
            isAnimating: false,
            index: 0
        };
    }

    /**
     * 添加卡牌到手牌
     */
    addCard(cardData) {
        const card = this.createCard(cardData);
        card.index = this.cards.length;
        this.cards.push(card);
        this.cardGroup.add(card.mesh);

        this.arrangeCards();

        // 入场动画
        card.mesh.scale.set(0, 0, 0);
        this.animateCardScale(card, 1, 300);

        return card;
    }

    /**
     * 移除卡牌
     */
    removeCard(cardId) {
        const index = this.cards.findIndex(c => c.id === cardId);
        if (index === -1) return;

        const card = this.cards[index];

        // 离场动画
        this.animateCardScale(card, 0, 200, () => {
            this.cardGroup.remove(card.mesh);
            card.mesh.geometry.dispose();
        });

        this.cards.splice(index, 1);

        // 更新索引
        this.cards.forEach((c, i) => c.index = i);

        setTimeout(() => this.arrangeCards(), 250);
    }

    /**
     * 扇形排列卡牌
     */
    arrangeCards() {
        const count = this.cards.length;
        if (count === 0) return;

        const { fanRadius, fanAngle } = this.cardConfig;
        const angleStep = count > 1 ? fanAngle / (count - 1) : 0;
        const startAngle = -fanAngle / 2;

        this.cards.forEach((card, i) => {
            const angle = startAngle + angleStep * i;
            const x = Math.sin(angle) * fanRadius * 0.5;
            const z = Math.cos(angle) * fanRadius - fanRadius;
            const y = Math.abs(angle) * 0.3;

            card.targetPosition = new THREE.Vector3(x, y, z);
            card.targetRotation = new THREE.Euler(0, angle * 0.5, -angle * 0.3);
            card.originalY = y;

            this.animateCardTransform(card, card.targetPosition, card.targetRotation, 400);
        });
    }

    /**
     * 翻转卡牌
     */
    flipCard(cardId, duration = 500) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card || card.isAnimating) return;

        card.isAnimating = true;
        card.isFlipped = !card.isFlipped;

        const startRotation = card.mesh.rotation.y;
        const targetRotation = startRotation + Math.PI;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeInOutCubic(progress);

            card.mesh.rotation.y = startRotation + (targetRotation - startRotation) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                card.isAnimating = false;
            }
        };

        animate();
    }

    /**
     * 出牌动画
     */
    playCard(cardId, targetPosition) {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        card.isAnimating = true;

        // 先抬起卡牌
        const liftPosition = card.mesh.position.clone();
        liftPosition.y += 2;
        liftPosition.z += 3;

        // 阶段1: 抬起
        this.animateCardTransform(card, liftPosition, new THREE.Euler(0, 0, 0), 200, () => {
            // 阶段2: 飞向目标
            this.animateCardTransform(card, targetPosition, new THREE.Euler(0, Math.PI * 2, 0), 400, () => {
                // 阶段3: 效果完成后移除
                setTimeout(() => {
                    this.removeCard(cardId);
                    this.onCardPlay(card.data);
                }, 200);
            });
        });
    }

    /**
     * 选中卡牌
     */
    selectCard(cardId) {
        if (this.selectedCard === cardId) return;

        // 重置之前选中的卡牌
        if (this.selectedCard !== null) {
            const prevCard = this.cards.find(c => c.id === this.selectedCard);
            if (prevCard) {
                this.animateCardPosition(prevCard, prevCard.originalY, 200);
                prevCard.mesh.material[4].emissive = new THREE.Color(0x000000);
            }
        }

        this.selectedCard = cardId;

        if (cardId !== null) {
            const card = this.cards.find(c => c.id === cardId);
            if (card) {
                this.animateCardPosition(card, card.originalY + 0.8, 200);
                card.mesh.material[4].emissive = new THREE.Color(0xFFD700);
                card.mesh.material[4].emissiveIntensity = 0.3;
            }
        }
    }

    /**
     * 初始化交互
     */
    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    }

    /**
     * 点击处理
     */
    onClick(event) {
        this.updateMousePosition(event);
        const card = this.getIntersectedCard();

        if (card) {
            if (this.selectedCard === card.id) {
                // 已选中，出牌
                const playPosition = new THREE.Vector3(0, 5, 8);
                this.playCard(card.id, playPosition);
            } else {
                // 选中
                this.selectCard(card.id);
                this.onCardClick(card.data);
            }
        } else {
            this.selectCard(null);
        }
    }

    /**
     * 鼠标移动处理
     */
    onMouseMove(event) {
        this.updateMousePosition(event);
        const card = this.getIntersectedCard();

        if (card && card.id !== this.selectedCard) {
            if (this.hoveredCard !== card.id) {
                this.hoveredCard = card.id;
                this.animateCardPosition(card, card.originalY + 0.3, 150);
                this.renderer.domElement.style.cursor = 'pointer';
            }
        } else if (this.hoveredCard !== null) {
            const prevCard = this.cards.find(c => c.id === this.hoveredCard);
            if (prevCard && prevCard.id !== this.selectedCard) {
                this.animateCardPosition(prevCard, prevCard.originalY, 150);
            }
            this.hoveredCard = null;
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    /**
     * 触摸开始
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

            const card = this.getIntersectedCard();
            if (card) {
                event.preventDefault();
                if (this.selectedCard === card.id) {
                    const playPosition = new THREE.Vector3(0, 5, 8);
                    this.playCard(card.id, playPosition);
                } else {
                    this.selectCard(card.id);
                    this.onCardClick(card.data);
                }
            }
        }
    }

    /**
     * 更新鼠标位置
     */
    updateMousePosition(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * 获取射线 intersect 的卡牌
     */
    getIntersectedCard() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.cards.map(c => c.mesh)
        );

        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            return this.cards.find(c => c.id === mesh.userData.cardId);
        }
        return null;
    }

    /**
     * 动画: 卡牌缩放
     */
    animateCardScale(card, targetScale, duration, onComplete) {
        const startScale = card.mesh.scale.x;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutBack(progress);

            const scale = startScale + (targetScale - startScale) * easeProgress;
            card.mesh.scale.set(scale, scale, scale);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };

        animate();
    }

    /**
     * 动画: 卡牌位置
     */
    animateCardPosition(card, targetY, duration) {
        const startY = card.mesh.position.y;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutCubic(progress);

            card.mesh.position.y = startY + (targetY - startY) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * 动画: 卡牌变换
     */
    animateCardTransform(card, targetPos, targetRot, duration, onComplete) {
        const startPos = card.mesh.position.clone();
        const startRot = card.mesh.rotation.clone();
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutCubic(progress);

            card.mesh.position.lerpVectors(startPos, targetPos, easeProgress);
            card.mesh.rotation.x = startRot.x + (targetRot.x - startRot.x) * easeProgress;
            card.mesh.rotation.y = startRot.y + (targetRot.y - startRot.y) * easeProgress;
            card.mesh.rotation.z = startRot.z + (targetRot.z - startRot.z) * easeProgress;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };

        animate();
    }

    /**
     * 缓动函数
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    /**
     * 清空手牌
     */
    clearHand() {
        this.cards.forEach(card => {
            this.cardGroup.remove(card.mesh);
            card.mesh.geometry.dispose();
        });
        this.cards = [];
        this.selectedCard = null;
        this.hoveredCard = null;
    }

    /**
     * 更新
     */
    update(deltaTime, elapsedTime) {
        // 选中卡牌的光晕效果
        if (this.selectedCard !== null) {
            const card = this.cards.find(c => c.id === this.selectedCard);
            if (card) {
                const intensity = 0.3 + Math.sin(elapsedTime * 3) * 0.2;
                card.mesh.material[4].emissiveIntensity = intensity;
            }
        }
    }

    /**
     * 销毁
     */
    dispose() {
        this.renderer.domElement.removeEventListener('click', this.onClick);
        this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);

        this.clearHand();
        this.scene.remove(this.cardGroup);
    }
}

export default Cards3D;
