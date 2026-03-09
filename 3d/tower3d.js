/**
 * Tower3D - 命运塔13层3D渲染系统
 * 塔楼模型、玩家位置、守卫标记、层交互
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Tower3D {
    constructor(sceneManager, options = {}) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        this.camera = sceneManager.getCamera();
        this.renderer = sceneManager.getRenderer();

        this.isMobile = window.innerWidth < 768;
        this.layers = [];
        this.players = new Map();
        this.guards = new Map();
        this.selectedLayer = null;
        this.onLayerClick = options.onLayerClick || (() => {});

        // 13层配置
        this.layerConfigs = [
            { name: '第一层·命运之基', color: 0x8B4513, height: 1.2, radius: 6.0, emissive: 0x2a1505 },
            { name: '第二层·勇气试炼', color: 0xCD853F, height: 1.1, radius: 5.6, emissive: 0x3d2510 },
            { name: '第三层·智慧迷宫', color: 0x4682B4, height: 1.1, radius: 5.2, emissive: 0x102540 },
            { name: '第四层·力量考验', color: 0x2E8B57, height: 1.0, radius: 4.8, emissive: 0x0f3018 },
            { name: '第五层·速度极限', color: 0x9370DB, height: 1.0, radius: 4.5, emissive: 0x201040 },
            { name: '第六层·阴影深渊', color: 0x483D8B, height: 1.0, radius: 4.2, emissive: 0x151030 },
            { name: '第七层·元素风暴', color: 0xFF6347, height: 0.9, radius: 3.9, emissive: 0x401510 },
            { name: '第八层·时空扭曲', color: 0x20B2AA, height: 0.9, radius: 3.6, emissive: 0x083030 },
            { name: '第九层·灵魂试炼', color: 0xDC143C, height: 0.9, radius: 3.4, emissive: 0x300810 },
            { name: '第十层·神之领域', color: 0xFFD700, height: 0.8, radius: 3.2, emissive: 0x403000 },
            { name: '第十一层·永恒之门', color: 0xFF8C00, height: 0.8, radius: 3.0, emissive: 0x402000 },
            { name: '第十二层·命运之巅', color: 0xC0C0C0, height: 0.8, radius: 2.8, emissive: 0x303030 },
            { name: '第十三层·神座', color: 0xFFFFFF, height: 1.0, radius: 2.5, emissive: 0x404040 }
        ];

        this.initTower();
        this.initControls();
        this.initInteraction();
        this.initRaycaster();
    }

    /**
     * 初始化塔楼
     */
    initTower() {
        this.towerGroup = new THREE.Group();

        let currentY = 0;

        this.layerConfigs.forEach((config, index) => {
            const layer = this.createLayer(config, index, currentY);
            this.layers.push(layer);
            this.towerGroup.add(layer.mesh);
            currentY += config.height;
        });

        // 添加塔顶装饰
        this.createTowerTop(currentY);

        // 添加底座
        this.createBase();

        this.scene.add(this.towerGroup);

        // 保存总高度
        this.totalHeight = currentY;
    }

    /**
     * 创建单层
     */
    createLayer(config, index, y) {
        // 主体几何体 - 八角形柱体
        const geometry = new THREE.CylinderGeometry(
            config.radius * 0.85,
            config.radius,
            config.height,
            8
        );

        // 材质
        const material = new THREE.MeshStandardMaterial({
            color: config.color,
            metalness: 0.6,
            roughness: 0.4,
            emissive: config.emissive,
            emissiveIntensity: 0.2
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = y + config.height / 2;
        mesh.castShadow = !this.isMobile;
        mesh.receiveShadow = !this.isMobile;
        mesh.userData = { layerIndex: index, config: config };

        // 添加层边缘发光效果
        const edgeGeometry = new THREE.CylinderGeometry(
            config.radius * 0.87,
            config.radius * 1.02,
            config.height * 0.1,
            8
        );
        const edgeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.6
        });
        const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
        edge.position.y = -config.height * 0.4;
        mesh.add(edge);

        // 添加层编号
        if (!this.isMobile) {
            this.createLayerNumber(index + 1, config.radius, mesh);
        }

        return {
            index: index,
            mesh: mesh,
            config: config,
            y: y + config.height / 2,
            radius: config.radius,
            players: [],
            guard: null
        };
    }

    /**
     * 创建层编号
     */
    createLayerNumber(number, radius, parent) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, 128, 128);

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), 64, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1.5, 1.5, 1);
        sprite.position.set(0, 0, radius * 1.1);

        parent.add(sprite);
    }

    /**
     * 创建塔顶
     */
    createTowerTop(y) {
        // 尖顶
        const topGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const topMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.y = y + 1.5;
        top.castShadow = !this.isMobile;
        this.towerGroup.add(top);

        // 顶部光球
        const orbGeometry = new THREE.SphereGeometry(0.8, 16, 16);
        const orbMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.9
        });
        this.topOrb = new THREE.Mesh(orbGeometry, orbMaterial);
        this.topOrb.position.y = y + 3;
        this.towerGroup.add(this.topOrb);

        // 顶部光源
        const topLight = new THREE.PointLight(0xFFD700, 1, 10);
        topLight.position.y = y + 3;
        this.towerGroup.add(topLight);
    }

    /**
     * 创建底座
     */
    createBase() {
        const baseGeometry = new THREE.CylinderGeometry(7, 8, 1, 8);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a2a2a,
            metalness: 0.8,
            roughness: 0.5
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = -0.5;
        base.receiveShadow = !this.isMobile;
        this.towerGroup.add(base);

        // 底座光环
        const ringGeometry = new THREE.RingGeometry(7.5, 8.5, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = -0.4;
        this.towerGroup.add(ring);
    }

    /**
     * 初始化控制器
     */
    initControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 60;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;

        // 限制垂直角度
        this.controls.minPolarAngle = Math.PI / 6;

        // 移动端优化
        if (this.isMobile) {
            this.controls.enableZoom = false;
            this.controls.enablePan = false;
            this.controls.rotateSpeed = 0.7;
        }
    }

    /**
     * 初始化交互
     */
    initInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.touchStartTime = 0;
        this.touchStartPos = new THREE.Vector2();

        // 鼠标事件
        this.renderer.domElement.addEventListener('click', this.onClick.bind(this));
        this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));

        // 触摸事件
        this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false });
    }

    /**
     * 初始化射线检测
     */
    initRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    /**
     * 点击处理
     */
    onClick(event) {
        this.updateMousePosition(event);
        this.checkIntersection();
    }

    /**
     * 鼠标移动处理
     */
    onMouseMove(event) {
        this.updateMousePosition(event);

        const intersect = this.getIntersection();
        this.renderer.domElement.style.cursor = intersect ? 'pointer' : 'default';

        // 悬停效果
        if (intersect && intersect.object.userData.layerIndex !== undefined) {
            this.highlightLayer(intersect.object.userData.layerIndex);
        } else {
            this.clearHighlight();
        }
    }

    /**
     * 触摸开始
     */
    onTouchStart(event) {
        this.touchStartTime = Date.now();
        if (event.touches.length === 1) {
            this.touchStartPos.set(
                event.touches[0].clientX,
                event.touches[0].clientY
            );
        }
    }

    /**
     * 触摸结束
     */
    onTouchEnd(event) {
        const touchDuration = Date.now() - this.touchStartTime;
        if (touchDuration < 200 && event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            const touchEndPos = new THREE.Vector2(touch.clientX, touch.clientY);
            const distance = touchEndPos.distanceTo(this.touchStartPos);

            if (distance < 10) {
                // 视为点击
                this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
                this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
                this.checkIntersection();
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
     * 获取射线交点
     */
    getIntersection() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(
            this.layers.map(l => l.mesh)
        );
        return intersects.length > 0 ? intersects[0] : null;
    }

    /**
     * 检测交互
     */
    checkIntersection() {
        const intersect = this.getIntersection();
        if (intersect && intersect.object.userData.layerIndex !== undefined) {
            const layerIndex = intersect.object.userData.layerIndex;
            this.selectLayer(layerIndex);
            this.onLayerClick(layerIndex, this.layerConfigs[layerIndex]);
        }
    }

    /**
     * 高亮层
     */
    highlightLayer(index) {
        if (this.selectedLayer === index) return;

        this.clearHighlight();

        const layer = this.layers[index];
        layer.mesh.material.emissiveIntensity = 0.6;
        layer.highlighted = true;
    }

    /**
     * 清除高亮
     */
    clearHighlight() {
        this.layers.forEach(layer => {
            if (layer.highlighted && this.selectedLayer !== layer.index) {
                layer.mesh.material.emissiveIntensity = 0.2;
                layer.highlighted = false;
            }
        });
    }

    /**
     * 选择层
     */
    selectLayer(index) {
        // 重置之前的选择
        if (this.selectedLayer !== null && this.selectedLayer !== index) {
            const prevLayer = this.layers[this.selectedLayer];
            prevLayer.mesh.material.emissiveIntensity = 0.2;
        }

        this.selectedLayer = index;
        const layer = this.layers[index];
        layer.mesh.material.emissiveIntensity = 0.8;

        // 停止自动旋转
        this.controls.autoRotate = false;

        // 相机聚焦
        this.focusOnLayer(index);
    }

    /**
     * 相机聚焦到层
     */
    focusOnLayer(index) {
        const layer = this.layers[index];
        const targetY = layer.y;
        const radius = layer.radius;

        // 平滑移动相机
        const targetPosition = new THREE.Vector3(
            radius * 2.5,
            targetY,
            radius * 2.5
        );

        this.animateCamera(targetPosition, new THREE.Vector3(0, targetY, 0));
    }

    /**
     * 相机动画
     */
    animateCamera(targetPos, targetLookAt) {
        const startPos = this.camera.position.clone();
        const startLookAt = this.controls.target.clone();
        const duration = 1000;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);

            this.camera.position.lerpVectors(startPos, targetPos, easeProgress);
            this.controls.target.lerpVectors(startLookAt, targetLookAt, easeProgress);
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * 添加玩家到层
     */
    addPlayerToLayer(playerId, layerIndex, options = {}) {
        const layer = this.layers[layerIndex];
        if (!layer) return null;

        // 创建玩家头像
        const avatar = this.createPlayerAvatar(options);

        // 计算位置 - 在层边缘均匀分布
        const playerCount = layer.players.length;
        const angle = (playerCount * Math.PI * 2 / 8) + (Math.random() * 0.5);
        const distance = layer.radius * 0.7;

        avatar.position.set(
            Math.cos(angle) * distance,
            layer.y + 0.5,
            Math.sin(angle) * distance
        );

        avatar.userData = { playerId, layerIndex };
        this.towerGroup.add(avatar);

        layer.players.push({ playerId, avatar });
        this.players.set(playerId, { avatar, layerIndex });

        return avatar;
    }

    /**
     * 创建玩家头像
     */
    createPlayerAvatar(options) {
        const group = new THREE.Group();

        // 头像底座
        const baseGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: options.color || 0xFFD700,
            metalness: 0.8,
            roughness: 0.2
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        group.add(base);

        // 头像球体
        const headGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const headMaterial = new THREE.MeshStandardMaterial({
            color: options.skinColor || 0xFFDBAC,
            metalness: 0.1,
            roughness: 0.8
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 0.35;
        group.add(head);

        // 名称标签
        if (options.name && !this.isMobile) {
            const label = this.createNameLabel(options.name);
            label.position.y = 0.8;
            group.add(label);
        }

        // 悬浮动画
        group.userData.floatOffset = Math.random() * Math.PI * 2;

        return group;
    }

    /**
     * 创建名称标签
     */
    createNameLabel(name) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.roundRect(0, 0, 256, 64, 10);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, 128, 32);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 0.5, 1);

        return sprite;
    }

    /**
     * 移除玩家
     */
    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        const layer = this.layers[player.layerIndex];
        layer.players = layer.players.filter(p => p.playerId !== playerId);

        this.towerGroup.remove(player.avatar);
        this.players.delete(playerId);
    }

    /**
     * 移动玩家到层
     */
    movePlayerToLayer(playerId, targetLayerIndex) {
        this.removePlayer(playerId);
        return this.addPlayerToLayer(playerId, targetLayerIndex);
    }

    /**
     * 添加守卫
     */
    addGuardToLayer(layerIndex, options = {}) {
        const layer = this.layers[layerIndex];
        if (!layer || layer.guard) return null;

        const guard = this.createGuardMarker(options);
        guard.position.set(0, layer.y + 0.5, 0);

        this.towerGroup.add(guard);
        layer.guard = { avatar: guard, ...options };
        this.guards.set(layerIndex, layer.guard);

        return guard;
    }

    /**
     * 创建守卫标记
     */
    createGuardMarker(options) {
        const group = new THREE.Group();

        // 守卫底座
        const baseGeometry = new THREE.CylinderGeometry(0.4, 0.5, 0.15, 6);
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B0000,
            metalness: 0.7,
            roughness: 0.3,
            emissive: 0x400000,
            emissiveIntensity: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        group.add(base);

        // 守卫图标
        const iconGeometry = new THREE.ConeGeometry(0.25, 0.5, 4);
        const iconMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            metalness: 0.9,
            roughness: 0.1,
            emissive: 0xFF0000,
            emissiveIntensity: 0.4
        });
        const icon = new THREE.Mesh(iconGeometry, iconMaterial);
        icon.position.y = 0.4;
        group.add(icon);

        // 守卫光环
        const ringGeometry = new THREE.RingGeometry(0.5, 0.6, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF0000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.1;
        group.add(ring);

        // 旋转动画
        group.userData.rotateSpeed = 1;

        return group;
    }

    /**
     * 移除守卫
     */
    removeGuard(layerIndex) {
        const layer = this.layers[layerIndex];
        if (!layer || !layer.guard) return;

        this.towerGroup.remove(layer.guard.avatar);
        layer.guard = null;
        this.guards.delete(layerIndex);
    }

    /**
     * 更新动画
     */
    update(deltaTime, elapsedTime) {
        // 更新控制器
        this.controls.update();

        // 顶部光球动画
        if (this.topOrb) {
            this.topOrb.rotation.y = elapsedTime * 0.5;
            this.topOrb.material.opacity = 0.7 + Math.sin(elapsedTime * 2) * 0.2;
        }

        // 玩家悬浮动画
        this.players.forEach((player, playerId) => {
            const avatar = player.avatar;
            const floatY = Math.sin(elapsedTime * 2 + avatar.userData.floatOffset) * 0.1;
            avatar.position.y += floatY * deltaTime;
            avatar.rotation.y = elapsedTime * 0.5;
        });

        // 守卫旋转动画
        this.layers.forEach(layer => {
            if (layer.guard) {
                layer.guard.avatar.rotation.y += layer.guard.avatar.userData.rotateSpeed * deltaTime;
            }
        });
    }

    /**
     * 重置视角
     */
    resetView() {
        this.controls.autoRotate = true;
        this.selectedLayer = null;
        this.animateCamera(
            new THREE.Vector3(0, 15, 35),
            new THREE.Vector3(0, 8, 0)
        );
    }

    /**
     * 获取层信息
     */
    getLayerInfo(index) {
        return this.layers[index];
    }

    /**
     * 销毁
     */
    dispose() {
        this.renderer.domElement.removeEventListener('click', this.onClick);
        this.renderer.domElement.removeEventListener('mousemove', this.onMouseMove);
        this.renderer.domElement.removeEventListener('touchstart', this.onTouchStart);
        this.renderer.domElement.removeEventListener('touchend', this.onTouchEnd);

        this.controls.dispose();

        this.layers.forEach(layer => {
            layer.mesh.geometry.dispose();
            layer.mesh.material.dispose();
        });

        this.scene.remove(this.towerGroup);
    }
}

export default Tower3D;
