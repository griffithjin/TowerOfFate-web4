/**
 * Scene Manager - 命运塔3D场景管理
 * 灯光、背景、雾效、性能优化
 */

import * as THREE from 'three';

export class SceneManager {
    constructor(container) {
        this.container = container;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        this.isMobile = this.width < 768;

        this.initRenderer();
        this.initScene();
        this.initCamera();
        this.initLights();
        this.initBackground();
        this.initFog();
        this.initResizeHandler();
    }

    /**
     * 初始化渲染器
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: !this.isMobile,
            alpha: true,
            powerPreference: 'high-performance'
        });

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 2 : 3));
        this.renderer.setClearColor(0x0a0a0f, 1);

        // 性能优化设置
        this.renderer.shadowMap.enabled = !this.isMobile;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // 移动端优化
        if (this.isMobile) {
            this.renderer.setPixelRatio(1.5);
        }

        this.container.appendChild(this.renderer.domElement);
    }

    /**
     * 初始化场景
     */
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0f);
    }

    /**
     * 初始化相机
     */
    initCamera() {
        const fov = this.isMobile ? 60 : 45;
        this.camera = new THREE.PerspectiveCamera(
            fov,
            this.width / this.height,
            0.1,
            1000
        );
        this.camera.position.set(0, 15, 35);
        this.camera.lookAt(0, 8, 0);
    }

    /**
     * 初始化灯光系统
     */
    initLights() {
        // 环境光
        this.ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
        this.scene.add(this.ambientLight);

        // 主光源 - 金色方向光
        this.mainLight = new THREE.DirectionalLight(0xffd700, 1.5);
        this.mainLight.position.set(10, 20, 10);
        this.mainLight.castShadow = !this.isMobile;

        if (!this.isMobile) {
            this.mainLight.shadow.mapSize.width = 2048;
            this.mainLight.shadow.mapSize.height = 2048;
            this.mainLight.shadow.camera.near = 0.5;
            this.mainLight.shadow.camera.far = 50;
            this.mainLight.shadow.bias = -0.001;
        }
        this.scene.add(this.mainLight);

        // 补光 - 蓝色调
        this.fillLight = new THREE.DirectionalLight(0x4169e1, 0.5);
        this.fillLight.position.set(-10, 10, -5);
        this.scene.add(this.fillLight);

        // 轮廓光 - 紫色
        this.rimLight = new THREE.SpotLight(0x9b59b6, 1.0);
        this.rimLight.position.set(0, 15, -15);
        this.rimLight.lookAt(0, 5, 0);
        this.scene.add(this.rimLight);

        // 塔底发光
        this.baseLight = new THREE.PointLight(0xffd700, 0.8, 20);
        this.baseLight.position.set(0, 0, 0);
        this.scene.add(this.baseLight);

        // 顶部光源
        this.topLight = new THREE.PointLight(0xffffff, 0.5, 15);
        this.topLight.position.set(0, 18, 0);
        this.scene.add(this.topLight);
    }

    /**
     * 初始化星空背景
     */
    initBackground() {
        // 创建星空粒子
        const starCount = this.isMobile ? 500 : 1500;
        const starGeometry = new THREE.BufferGeometry();
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        const starSizes = new Float32Array(starCount);

        const colorPalette = [
            new THREE.Color(0xffffff),
            new THREE.Color(0xffd700),
            new THREE.Color(0x87ceeb),
            new THREE.Color(0xffa500)
        ];

        for (let i = 0; i < starCount; i++) {
            // 位置 - 球形分布
            const radius = 50 + Math.random() * 50;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            starPositions[i * 3 + 2] = radius * Math.cos(phi);

            // 颜色
            const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
            starColors[i * 3] = color.r;
            starColors[i * 3 + 1] = color.g;
            starColors[i * 3 + 2] = color.b;

            // 大小
            starSizes[i] = Math.random() * 2 + 0.5;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

        const starMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                varying vec3 vColor;
                uniform float time;

                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    float twinkle = sin(time * 2.0 + position.x * 0.1) * 0.3 + 0.7;
                    gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;

                void main() {
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(this.stars);

        // 添加星云效果
        if (!this.isMobile) {
            this.initNebula();
        }
    }

    /**
     * 星云效果
     */
    initNebula() {
        const nebulaGeometry = new THREE.PlaneGeometry(100, 100, 32, 32);
        const nebulaMaterial = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                color1: { value: new THREE.Color(0x1a0a3e) },
                color2: { value: new THREE.Color(0x0a1a3e) }
            },
            vertexShader: `
                varying vec2 vUv;
                uniform float time;

                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    pos.z += sin(pos.x * 0.1 + time * 0.1) * 2.0;
                    pos.z += cos(pos.y * 0.1 + time * 0.15) * 2.0;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                uniform float time;
                varying vec2 vUv;

                float noise(vec2 p) {
                    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                }

                void main() {
                    float n = noise(vUv * 10.0 + time * 0.05);
                    vec3 color = mix(color1, color2, n);
                    float alpha = 0.3 * (1.0 - length(vUv - 0.5) * 1.5);
                    gl_FragColor = vec4(color, max(0.0, alpha));
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.nebula = new THREE.Mesh(nebulaGeometry, nebulaMaterial);
        this.nebula.position.z = -30;
        this.nebula.rotation.x = -0.2;
        this.scene.add(this.nebula);
    }

    /**
     * 初始化雾效
     */
    initFog() {
        // 仅在高性能设备上启用雾效
        if (!this.isMobile) {
            this.scene.fog = new THREE.FogExp2(0x0a0a0f, 0.015);
        }
    }

    /**
     * 响应式处理
     */
    initResizeHandler() {
        this.resizeHandler = () => {
            this.width = this.container.clientWidth;
            this.height = this.container.clientHeight;
            this.isMobile = this.width < 768;

            this.camera.aspect = this.width / this.height;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(this.width, this.height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 2 : 3));
        };

        window.addEventListener('resize', this.resizeHandler);
    }

    /**
     * 更新动画
     */
    update(deltaTime, elapsedTime) {
        // 更新星空闪烁
        if (this.stars) {
            this.stars.material.uniforms.time.value = elapsedTime;
            this.stars.rotation.y = elapsedTime * 0.02;
        }

        // 更新星云
        if (this.nebula) {
            this.nebula.material.uniforms.time.value = elapsedTime;
        }
    }

    /**
     * 渲染
     */
    render() {
        this.renderer.render(this.scene, this.camera);
    }

    /**
     * 获取场景
     */
    getScene() {
        return this.scene;
    }

    /**
     * 获取相机
     */
    getCamera() {
        return this.camera;
    }

    /**
     * 获取渲染器
     */
    getRenderer() {
        return this.renderer;
    }

    /**
     * 销毁
     */
    dispose() {
        window.removeEventListener('resize', this.resizeHandler);

        if (this.stars) {
            this.stars.geometry.dispose();
            this.stars.material.dispose();
        }

        if (this.nebula) {
            this.nebula.geometry.dispose();
            this.nebula.material.dispose();
        }

        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

export default SceneManager;
