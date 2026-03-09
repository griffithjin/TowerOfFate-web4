/**
 * Effects - 特效系统
 * 晋升、回退、激怒、首登者特效、粒子效果
 */

import * as THREE from 'three';

export class Effects {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.scene = sceneManager.getScene();
        this.isMobile = window.innerWidth < 768;

        this.activeEffects = [];
        this.particleSystems = [];

        this.initSharedGeometries();
        this.initSharedMaterials();
    }

    /**
     * 初始化共享几何体
     */
    initSharedGeometries() {
        // 粒子几何体
        this.particleGeometry = new THREE.BufferGeometry();
        const particleCount = this.isMobile ? 50 : 100;
        const positions = new Float32Array(particleCount * 3);
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // 闪电几何体
        this.lightningGeometry = new THREE.BufferGeometry();
    }

    /**
     * 初始化共享材质
     */
    initSharedMaterials() {
        // 金色粒子材质
        this.goldParticleMaterial = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 红色粒子材质
        this.redParticleMaterial = new THREE.PointsMaterial({
            color: 0xFF0000,
            size: 0.3,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // 闪电材质
        this.lightningMaterial = new THREE.LineBasicMaterial({
            color: 0xFF0000,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
    }

    // ==================== 晋升特效 ====================

    /**
     * 创建晋升特效（金光上升）
     */
    createPromotionEffect(position, options = {}) {
        const effectGroup = new THREE.Group();
        effectGroup.position.copy(position);

        // 1. 金色光柱
        const pillar = this.createLightPillar(0xFFD700, 8);
        effectGroup.add(pillar);

        // 2. 上升粒子
        const particles = this.createRisingParticles(0xFFD700, 80);
        effectGroup.add(particles);

        // 3. 光环扩散
        const rings = this.createExpandingRings(0xFFD700, 3);
        effectGroup.add(rings);

        // 4. 闪光
        const flash = this.createFlash(0xFFFFFF, 1.5);
        effectGroup.add(flash);

        this.scene.add(effectGroup);

        const effect = {
            type: 'promotion',
            group: effectGroup,
            pillar,
            particles,
            rings,
            flash,
            startTime: Date.now(),
            duration: options.duration || 3000,
            update: this.updatePromotionEffect.bind(this)
        };

        this.activeEffects.push(effect);
        return effect;
    }

    /**
     * 更新晋升特效
     */
    updatePromotionEffect(effect, elapsed, deltaTime) {
        const progress = Math.min(elapsed / effect.duration, 1);

        // 光柱缩放
        effect.pillar.scale.y = 1 + Math.sin(progress * Math.PI) * 0.5;
        effect.pillar.material.opacity = Math.sin(progress * Math.PI) * 0.6;

        // 粒子上升
        const positions = effect.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] += deltaTime * 3;
            if (positions[i + 1] > 8) {
                positions[i + 1] = 0;
            }
        }
        effect.particles.geometry.attributes.position.needsUpdate = true;

        // 光环扩散
        effect.rings.children.forEach((ring, i) => {
            const ringProgress = (progress * 3 + i * 0.3) % 1;
            ring.scale.setScalar(1 + ringProgress * 3);
            ring.material.opacity = (1 - ringProgress) * 0.5;
        });

        // 闪光衰减
        effect.flash.intensity = Math.max(0, 2 * (1 - progress * 2));

        return progress < 1;
    }

    // ==================== 回退特效 ====================

    /**
     * 创建回退特效（红光下降）
     */
    createDemotionEffect(position, options = {}) {
        const effectGroup = new THREE.Group();
        effectGroup.position.copy(position);

        // 1. 红色光柱
        const pillar = this.createLightPillar(0x8B0000, 6);
        effectGroup.add(pillar);

        // 2. 下降粒子
        const particles = this.createFallingParticles(0xFF0000, 60);
        effectGroup.add(particles);

        // 3. 破碎效果
        const shards = this.createShards(0x8B0000, 20);
        effectGroup.add(shards);

        // 4. 冲击波
        const shockwave = this.createShockwave(0xFF0000);
        effectGroup.add(shockwave);

        this.scene.add(effectGroup);

        const effect = {
            type: 'demotion',
            group: effectGroup,
            pillar,
            particles,
            shards,
            shockwave,
            startTime: Date.now(),
            duration: options.duration || 2500,
            update: this.updateDemotionEffect.bind(this)
        };

        this.activeEffects.push(effect);
        return effect;
    }

    /**
     * 更新回退特效
     */
    updateDemotionEffect(effect, elapsed, deltaTime) {
        const progress = Math.min(elapsed / effect.duration, 1);

        // 光柱
        effect.pillar.material.opacity = Math.sin(progress * Math.PI) * 0.5;

        // 粒子下降
        const positions = effect.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= deltaTime * 4;
            if (positions[i + 1] < -5) {
                positions[i + 1] = 5;
            }
        }
        effect.particles.geometry.attributes.position.needsUpdate = true;

        // 碎片飞散
        effect.shards.children.forEach((shard, i) => {
            shard.position.add(shard.userData.velocity.clone().multiplyScalar(deltaTime));
            shard.rotation.x += deltaTime * 2;
            shard.rotation.y += deltaTime * 3;
            shard.material.opacity = Math.max(0, 1 - progress * 1.5);
        });

        // 冲击波
        effect.shockwave.scale.setScalar(1 + progress * 5);
        effect.shockwave.material.opacity = (1 - progress) * 0.4;

        return progress < 1;
    }

    // ==================== 激怒特效 ====================

    /**
     * 创建激怒特效（红色闪电）
     */
    createEnrageEffect(position, options = {}) {
        const effectGroup = new THREE.Group();
        effectGroup.position.copy(position);

        // 1. 闪电
        const lightnings = [];
        for (let i = 0; i < 5; i++) {
            const lightning = this.createLightning();
            lightnings.push(lightning);
            effectGroup.add(lightning);
        }

        // 2. 红色粒子爆发
        const particles = this.createBurstParticles(0xFF0000, 50);
        effectGroup.add(particles);

        // 3. 红色光晕
        const glow = this.createGlow(0xFF0000, 3);
        effectGroup.add(glow);

        this.scene.add(effectGroup);

        const effect = {
            type: 'enrage',
            group: effectGroup,
            lightnings,
            particles,
            glow,
            startTime: Date.now(),
            duration: options.duration || 2000,
            update: this.updateEnrageEffect.bind(this)
        };

        this.activeEffects.push(effect);
        return effect;
    }

    /**
     * 更新激怒特效
     */
    updateEnrageEffect(effect, elapsed, deltaTime) {
        const progress = Math.min(elapsed / effect.duration, 1);

        // 闪电闪烁
        effect.lightnings.forEach((lightning, i) => {
            if (Math.random() < 0.3) {
                this.updateLightningGeometry(lightning);
                lightning.visible = true;
            } else {
                lightning.visible = false;
            }

            // 随机旋转
            lightning.rotation.y = elapsed * 2 + i * Math.PI * 0.4;
            lightning.rotation.z = Math.sin(elapsed * 3 + i) * 0.3;
        });

        // 粒子爆发
        const positions = effect.particles.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            const velocity = effect.particles.userData.velocities[i / 3];
            positions[i] += velocity.x * deltaTime;
            positions[i + 1] += velocity.y * deltaTime;
            positions[i + 2] += velocity.z * deltaTime;
        }
        effect.particles.geometry.attributes.position.needsUpdate = true;
        effect.particles.material.opacity = 1 - progress;

        // 光晕脉动
        const pulse = 1 + Math.sin(elapsed * 10) * 0.3;
        effect.glow.scale.setScalar(pulse);
        effect.glow.material.opacity = (1 - progress) * 0.5;

        return progress < 1;
    }

    // ==================== 首登者特效 ====================

    /**
     * 创建首登者特效（全屏庆祝）
     */
    createFirstAscenderEffect(position, options = {}) {
        const effectGroup = new THREE.Group();
        effectGroup.position.copy(position);

        // 1. 彩虹光柱
        const rainbowPillar = this.createRainbowPillar();
        effectGroup.add(rainbowPillar);

        // 2. 烟花
        const fireworks = [];
        for (let i = 0; i < 8; i++) {
            const firework = this.createFirework(
                new THREE.Color().setHSL(i / 8, 1, 0.5)
            );
            firework.position.set(
                (Math.random() - 0.5) * 20,
                Math.random() * 10 + 5,
                (Math.random() - 0.5) * 20
            );
            firework.userData.delay = i * 200;
            fireworks.push(firework);
            effectGroup.add(firework);
        }

        // 3. 金色粒子雨
        const goldenRain = this.createGoldenRain(150);
        effectGroup.add(goldenRain);

        // 4. 皇冠
        const crown = this.createCrown();
        crown.position.y = 3;
        effectGroup.add(crown);

        // 5. 全屏闪光
        const screenFlash = this.createScreenFlash();

        this.scene.add(effectGroup);

        const effect = {
            type: 'firstAscender',
            group: effectGroup,
            rainbowPillar,
            fireworks,
            goldenRain,
            crown,
            screenFlash,
            startTime: Date.now(),
            duration: options.duration || 5000,
            update: this.updateFirstAscenderEffect.bind(this)
        };

        this.activeEffects.push(effect);
        return effect;
    }

    /**
     * 更新首登者特效
     */
    updateFirstAscenderEffect(effect, elapsed, deltaTime) {
        const progress = Math.min(elapsed / effect.duration, 1);

        // 彩虹光柱旋转
        effect.rainbowPillar.rotation.y = elapsed * 0.5;
        effect.rainbowPillar.material.opacity = Math.sin(progress * Math.PI) * 0.7;

        // 烟花
        effect.fireworks.forEach(firework => {
            if (elapsed > firework.userData.delay) {
                const fireworkProgress = (elapsed - firework.userData.delay) / 1000;
                if (fireworkProgress < 1) {
                    firework.visible = true;
                    firework.scale.setScalar(1 + fireworkProgress * 2);
                    firework.material.opacity = 1 - fireworkProgress;
                } else {
                    firework.visible = false;
                }
            }
        });

        // 金色粒子雨
        const positions = effect.goldenRain.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 1] -= deltaTime * 5;
            if (positions[i + 1] < 0) {
                positions[i + 1] = 20;
                positions[i] = (Math.random() - 0.5) * 30;
                positions[i + 2] = (Math.random() - 0.5) * 30;
            }
        }
        effect.goldenRain.geometry.attributes.position.needsUpdate = true;

        // 皇冠浮动
        effect.crown.position.y = 3 + Math.sin(elapsed * 2) * 0.5;
        effect.crown.rotation.y = elapsed;

        // 屏幕闪光
        if (progress < 0.2) {
            effect.screenFlash.intensity = (1 - progress * 5) * 2;
        } else {
            effect.screenFlash.intensity = 0;
        }

        return progress < 1;
    }

    // ==================== 辅助创建方法 ====================

    /**
     * 创建光柱
     */
    createLightPillar(color, height) {
        const geometry = new THREE.CylinderGeometry(0.5, 1, height, 8, 1, true);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.4,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const pillar = new THREE.Mesh(geometry, material);
        pillar.position.y = height / 2;
        return pillar;
    }

    /**
     * 创建上升粒子
     */
    createRisingParticles(color, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 1] = Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    /**
     * 创建下降粒子
     */
    createFallingParticles(color, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 1] = Math.random() * 6;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.25,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    /**
     * 创建扩散光环
     */
    createExpandingRings(color, count) {
        const group = new THREE.Group();

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.RingGeometry(0.5, 0.7, 32);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const ring = new THREE.Mesh(geometry, material);
            ring.rotation.x = -Math.PI / 2;
            ring.userData.delay = i * 0.3;
            group.add(ring);
        }

        return group;
    }

    /**
     * 创建闪光
     */
    createFlash(color, intensity) {
        const light = new THREE.PointLight(color, intensity, 20);
        return light;
    }

    /**
     * 创建碎片
     */
    createShards(color, count) {
        const group = new THREE.Group();

        for (let i = 0; i < count; i++) {
            const geometry = new THREE.TetrahedronGeometry(Math.random() * 0.3 + 0.1);
            const material = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.9
            });
            const shard = new THREE.Mesh(geometry, material);

            shard.position.set(
                (Math.random() - 0.5) * 2,
                Math.random() * 3,
                (Math.random() - 0.5) * 2
            );

            shard.userData.velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                Math.random() * 5,
                (Math.random() - 0.5) * 5
            );

            group.add(shard);
        }

        return group;
    }

    /**
     * 创建冲击波
     */
    createShockwave(color) {
        const geometry = new THREE.RingGeometry(0.1, 0.3, 32);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.rotation.x = -Math.PI / 2;
        return shockwave;
    }

    /**
     * 创建闪电
     */
    createLightning() {
        const points = [];
        const segments = 10;

        for (let i = 0; i <= segments; i++) {
            const y = (i / segments) * 6;
            const x = (Math.random() - 0.5) * 2;
            const z = (Math.random() - 0.5) * 2;
            points.push(new THREE.Vector3(x, y, z));
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const lightning = new THREE.Line(geometry, this.lightningMaterial.clone());

        return lightning;
    }

    /**
     * 更新闪电几何体
     */
    updateLightningGeometry(lightning) {
        const positions = lightning.geometry.attributes.position.array;
        const segments = positions.length / 3 - 1;

        for (let i = 1; i < segments; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }

        lightning.geometry.attributes.position.needsUpdate = true;
    }

    /**
     * 创建爆发粒子
     */
    createBurstParticles(color, count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];

        for (let i = 0; i < count; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;

            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            const speed = Math.random() * 5 + 2;

            velocities.push({
                x: Math.sin(phi) * Math.cos(theta) * speed,
                y: Math.cos(phi) * speed,
                z: Math.sin(phi) * Math.sin(theta) * speed
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.3,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.userData.velocities = velocities;

        return particles;
    }

    /**
     * 创建光晕
     */
    createGlow(color, size) {
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * 创建彩虹光柱
     */
    createRainbowPillar() {
        const geometry = new THREE.CylinderGeometry(1, 1.5, 15, 16, 1, true);

        // 创建彩虹渐变纹理
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.17, '#ff8800');
        gradient.addColorStop(0.33, '#ffff00');
        gradient.addColorStop(0.5, '#00ff00');
        gradient.addColorStop(0.67, '#0088ff');
        gradient.addColorStop(0.83, '#0000ff');
        gradient.addColorStop(1, '#ff00ff');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 256);

        const texture = new THREE.CanvasTexture(canvas);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const pillar = new THREE.Mesh(geometry, material);
        pillar.position.y = 7.5;
        return pillar;
    }

    /**
     * 创建烟花
     */
    createFirework(color) {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });
        return new THREE.Mesh(geometry, material);
    }

    /**
     * 创建金色粒子雨
     */
    createGoldenRain(count) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xFFD700,
            size: 0.4,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        return new THREE.Points(geometry, material);
    }

    /**
     * 创建皇冠
     */
    createCrown() {
        const group = new THREE.Group();

        // 皇冠底座
        const baseGeometry = new THREE.CylinderGeometry(0.8, 1, 0.3, 8);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFFD700,
            metalness: 1,
            roughness: 0.2,
            emissive: 0xFFD700,
            emissiveIntensity: 0.3
        });
        const base = new THREE.Mesh(baseGeometry, material);
        group.add(base);

        // 皇冠尖刺
        for (let i = 0; i < 5; i++) {
            const spikeGeometry = new THREE.ConeGeometry(0.15, 0.8, 4);
            const spike = new THREE.Mesh(spikeGeometry, material);
            const angle = (i / 5) * Math.PI * 2;
            spike.position.set(
                Math.cos(angle) * 0.6,
                0.5,
                Math.sin(angle) * 0.6
            );
            group.add(spike);
        }

        return group;
    }

    /**
     * 创建屏幕闪光
     */
    createScreenFlash() {
        const light = new THREE.PointLight(0xFFFFFF, 0, 50);
        light.position.set(0, 10, 0);
        this.scene.add(light);
        return light;
    }

    // ==================== 更新与清理 ====================

    /**
     * 更新所有特效
     */
    update(deltaTime, elapsedTime) {
        const now = Date.now();

        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            const elapsed = now - effect.startTime;

            const isActive = effect.update(effect, elapsed, deltaTime);

            if (!isActive) {
                this.removeEffect(effect);
                this.activeEffects.splice(i, 1);
            }
        }
    }

    /**
     * 移除特效
     */
    removeEffect(effect) {
        this.scene.remove(effect.group);

        // 清理几何体和材质
        effect.group.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });

        // 移除屏幕闪光
        if (effect.screenFlash) {
            this.scene.remove(effect.screenFlash);
        }
    }

    /**
     * 清除所有特效
     */
    clearAllEffects() {
        this.activeEffects.forEach(effect => this.removeEffect(effect));
        this.activeEffects = [];
    }

    /**
     * 销毁
     */
    dispose() {
        this.clearAllEffects();

        this.particleGeometry.dispose();
        this.goldParticleMaterial.dispose();
        this.redParticleMaterial.dispose();
        this.lightningMaterial.dispose();
    }
}

export default Effects;
