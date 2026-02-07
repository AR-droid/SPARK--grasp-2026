import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import modelMap from '../assets/model_map.json';
import hotspotMap from '../assets/hotspot_map.json';
import { api } from '../services/api';

const normalizeAssetType = (assetType = '', assetId = '') => {
    const t = assetType.toLowerCase();
    const id = (assetId || '').toUpperCase();

    if (t.includes('pressure') && t.includes('vessel')) return 'pressure_vessel';
    if (t.includes('vessel')) return 'pressure_vessel';
    if (t.includes('heat') && t.includes('exchanger')) return 'heat_exchanger';
    if (t.includes('exchanger')) return 'heat_exchanger';
    if (t.includes('storage') && t.includes('tank')) return 'storage_tank';
    if (t.includes('tank')) return 'storage_tank';
    if (t.includes('piping') || t.includes('pipe')) return 'piping_network';
    if (t.includes('rotating equipment')) return 'pump';
    if (t.includes('pump')) return 'pump';
    if (t.includes('motor')) return 'motor';
    if (t.includes('compressor')) return 'compressor';

    // Fallback by asset ID prefix
    if (id.startsWith('PV')) return 'pressure_vessel';
    if (id.startsWith('HE')) return 'heat_exchanger';
    if (id.startsWith('ST')) return 'storage_tank';
    if (id.startsWith('PN')) return 'piping_network';
    if (id.startsWith('P-')) return 'pump';

    return '';
};

const DigitalTwinViewer = ({ assetType, assetId, activeMetric, latestReading }) => {
    const containerRef = useRef(null);
    const [loadError, setLoadError] = useState('');
    const [components, setComponents] = useState([]);
    const [hoverLabel, setHoverLabel] = useState('');
    const [callouts, setCallouts] = useState([]);
    const meshMapRef = useRef({});
    const modelRef = useRef(null);
    const sceneRef = useRef(null);
    const markerGroupRef = useRef(null);
    const raycasterRef = useRef(new THREE.Raycaster());
    const mouseRef = useRef(new THREE.Vector2());
    const hoverMeshRef = useRef(null);

    const modelFile = useMemo(() => {
        const key = normalizeAssetType(assetType, assetId);
        return key ? modelMap[key] : '';
    }, [assetType, assetId]);

    const createLabelSprite = (text) => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(0.5, 0.5, canvas.width - 1, canvas.height - 1);
        ctx.fillStyle = 'white';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.1, 0.28, 1);
        return sprite;
    };

    const createGlowSprite = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
        gradient.addColorStop(0, 'rgba(255, 80, 0, 0.9)');
        gradient.addColorStop(0.4, 'rgba(255, 120, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 120, 0, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.6, 0.6, 1);
        return sprite;
    };

    const createArrow = (from, to) => {
        const dir = new THREE.Vector3().subVectors(to, from);
        const length = dir.length() || 0.2;
        dir.normalize();
        const arrow = new THREE.ArrowHelper(dir, from, length, 0x111111, 0.12, 0.08);
        arrow.cone.material.depthTest = false;
        arrow.line.material.depthTest = false;
        arrow.renderOrder = 999;
        return arrow;
    };

    const getFallbackPositions = (count, box) => {
        const positions = [];
        if (!box || count <= 0) return positions;
        const min = box.min;
        const max = box.max;
        const spanX = max.x - min.x;
        const spanY = max.y - min.y;
        const spanZ = max.z - min.z;
        for (let i = 0; i < count; i++) {
            const t = (i + 1) / (count + 1);
            positions.push(new THREE.Vector3(
                min.x + spanX * t,
                min.y + spanY * 0.7,
                max.z - spanZ * 0.1
            ));
        }
        return positions;
    };

    useEffect(() => {
        if (!assetId) return;
        let mounted = true;
        const fetchComponents = async () => {
            try {
                const res = await api.get(`/twin/components/${assetId}`);
                const list = res.data || [];
                if (list.length === 0) {
                    try {
                        await api.post('/twin/components/seed', { asset_id: assetId });
                        const seeded = await api.get(`/twin/components/${assetId}`);
                        if (mounted) setComponents(seeded.data || []);
                        return;
                    } catch (err) {
                        // ignore seeding errors
                    }
                }
                if (mounted) setComponents(list);
            } catch (err) {
                // ignore for now
            }
        };
        fetchComponents();
        return () => {
            mounted = false;
        };
    }, [assetId]);

    useEffect(() => {
        if (!containerRef.current || !modelFile) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        const scene = new THREE.Scene();
        sceneRef.current = scene;
        scene.background = new THREE.Color(0xd9d9d9);

        const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 2000);
        camera.position.set(3.2, 2.2, 3.8);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        const bgGeo = new THREE.PlaneGeometry(20, 20);
        const bgMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0xf2f2f2) },
                bottomColor: { value: new THREE.Color(0xcfcfcf) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                varying vec2 vUv;
                void main() {
                    vec3 color = mix(bottomColor, topColor, vUv.y);
                    gl_FragColor = vec4(color, 1.0);
                }
            `,
            depthWrite: false
        });
        const bgPlane = new THREE.Mesh(bgGeo, bgMat);
        bgPlane.position.set(0, 0, -8);
        scene.add(bgPlane);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x7a7a7a, 0.9);
        scene.add(hemi);
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
        keyLight.position.set(4, 6, 4);
        keyLight.castShadow = true;
        scene.add(keyLight);
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
        fillLight.position.set(-4, 3, -2);
        scene.add(fillLight);
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
        rimLight.position.set(0, 5, -6);
        scene.add(rimLight);

        const floorGeo = new THREE.PlaneGeometry(10, 10);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.9;
        floor.receiveShadow = true;
        scene.add(floor);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;

        const loader = new GLTFLoader();
        let modelRoot = null;
        let meshIndex = {};
        let modelBox = null;

        loader.load(
            `/models/${modelFile}`,
            (gltf) => {
                modelRoot = gltf.scene;
                modelRef.current = modelRoot;
                modelRoot.traverse((node) => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        if (node.material) {
                            node.material.envMapIntensity = 0.5;
                            if (!node.userData.baseColor && node.material.color) {
                                node.userData.baseColor = node.material.color.clone();
                            }
                            if (!node.userData.baseEmissive && node.material.emissive) {
                                node.userData.baseEmissive = node.material.emissive.clone();
                            }
                        }
                        meshIndex[node.name.toLowerCase()] = node;
                    }
                });
                meshMapRef.current = meshIndex;

                const box = new THREE.Box3().setFromObject(modelRoot);
                const size = new THREE.Vector3();
                box.getSize(size);
                const center = new THREE.Vector3();
                box.getCenter(center);

                // Center model at origin
                modelRoot.position.sub(center);

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = maxDim > 0 ? 3.0 / maxDim : 1;
                modelRoot.scale.setScalar(scale);

                // Recompute bounds after scaling/centering
                const box2 = new THREE.Box3().setFromObject(modelRoot);
                const center2 = new THREE.Vector3();
                box2.getCenter(center2);
                const size2 = new THREE.Vector3();
                box2.getSize(size2);
                modelBox = box2;

                // Lift model so it sits on the ground plane
                modelRoot.position.y -= box2.min.y;
                center2.y -= box2.min.y;

                // Update floor height just under the model
                floor.position.y = -0.02;

                // Fit camera to model
                const sphere = new THREE.Sphere();
                box2.getBoundingSphere(sphere);
                const radius = sphere.radius || 1;
                camera.near = Math.max(0.01, radius / 100);
                camera.far = radius * 50;
                camera.updateProjectionMatrix();
                camera.position.set(radius * 1.6, radius * 1.1, radius * 1.6);
                controls.target.copy(center2);
                controls.update();
                scene.add(modelRoot);
                if (!markerGroupRef.current) {
                    markerGroupRef.current = new THREE.Group();
                    markerGroupRef.current.renderOrder = 999;
                    scene.add(markerGroupRef.current);
                }
            },
            undefined,
            (err) => {
                console.error('Failed to load GLB', err);
                setLoadError('Failed to load digital twin model.');
            }
        );

        let animationFrame = 0;
        const start = performance.now();
        let lastCalloutUpdate = 0;
        const animate = () => {
            animationFrame = requestAnimationFrame(animate);
            const t = (performance.now() - start) / 1000;
            if (markerGroupRef.current) {
                const pulse = 0.85 + 0.25 * Math.sin(t * 2.4);
                markerGroupRef.current.children.forEach((m, idx) => {
                    if (m.userData.kind === 'marker') {
                        const scale = pulse + (idx % 3) * 0.05;
                        m.scale.setScalar(scale);
                    }
                    if (m.userData.kind === 'glow') {
                        const base = m.userData.baseScale || 0.6;
                        const boost = m.userData.pulse || 0.5;
                        const scale = base + boost * 0.2 * (1 + Math.sin(t * 3.2));
                        m.scale.setScalar(scale);
                    }
                });
            }
            if (markerGroupRef.current && t - lastCalloutUpdate > 0.2) {
                lastCalloutUpdate = t;
                const width = renderer.domElement.clientWidth;
                const height = renderer.domElement.clientHeight;
                const next = [];
                markerGroupRef.current.children.forEach((child, idx) => {
                    if (child.userData.kind !== 'marker') return;
                    const label = child.userData.label || `component-${idx + 1}`;
                    const metric = child.userData.metric || '';
                    const value = child.userData.value || '';
                    const pos = child.position.clone().project(camera);
                    const x = (pos.x * 0.5 + 0.5) * width;
                    const y = (-pos.y * 0.5 + 0.5) * height;
                    next.push({ id: `${label}-${idx}`, label, metric, value, x, y });
                });
                setCallouts(next);
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const onResize = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
        };
        window.addEventListener('resize', onResize);

        const onMove = (event) => {
            const rect = renderer.domElement.getBoundingClientRect();
            mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
            const raycaster = raycasterRef.current;
            raycaster.setFromCamera(mouseRef.current, camera);
            const meshes = Object.values(meshMapRef.current);
            const hits = raycaster.intersectObjects(meshes, true);
            if (hits.length > 0) {
                const hit = hits[0].object;
                if (hoverMeshRef.current && hoverMeshRef.current !== hit) {
                    const prev = hoverMeshRef.current;
                    if (prev.material && prev.userData.baseEmissive) {
                        prev.material.emissive.copy(prev.userData.baseEmissive);
                    }
                }
                hoverMeshRef.current = hit;
                if (hit.material) {
                    hit.material.emissive = hit.material.emissive || new THREE.Color(0x000000);
                    hit.material.emissive.setHex(0x2233ff);
                }
                setHoverLabel(hit.name || 'component');
                renderer.domElement.style.cursor = 'pointer';
            } else {
                if (hoverMeshRef.current && hoverMeshRef.current.material && hoverMeshRef.current.userData.baseEmissive) {
                    hoverMeshRef.current.material.emissive.copy(hoverMeshRef.current.userData.baseEmissive);
                }
                hoverMeshRef.current = null;
                setHoverLabel('');
                renderer.domElement.style.cursor = 'default';
            }
        };
        renderer.domElement.addEventListener('mousemove', onMove);

        return () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', onResize);
            renderer.domElement.removeEventListener('mousemove', onMove);
            controls.dispose();
            renderer.dispose();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
            if (modelRoot) {
                scene.remove(modelRoot);
            }
        };
    }, [modelFile]);

    useEffect(() => {
        if (!modelRef.current || !components) return;
        const metric = (activeMetric || '').toLowerCase();

        // Reset materials
        Object.values(meshMapRef.current).forEach((mesh) => {
            if (mesh.material && mesh.userData.baseColor) {
                mesh.material.color.copy(mesh.userData.baseColor);
            }
            if (mesh.material && mesh.userData.baseEmissive) {
                mesh.material.emissive.copy(mesh.userData.baseEmissive);
            }
        });

        if (markerGroupRef.current) {
            markerGroupRef.current.clear();
        }

        const showAll = true;

        const findMesh = (name) => {
            if (!name) return null;
            const key = name.toLowerCase();
            if (meshMapRef.current[key]) return meshMapRef.current[key];
            const normalized = key.replace(/[-\\s]/g, '_');
            const entry = Object.entries(meshMapRef.current).find(([k]) => k.includes(normalized) || normalized.includes(k));
            return entry ? entry[1] : null;
        };

        const modelBox = modelRef.current ? new THREE.Box3().setFromObject(modelRef.current) : null;
        const comps = components.length > 0 ? components : [
            { component: 'shell', mesh_name: 'pv_shell', metrics: ['pressure', 'audio'] },
            { component: 'nozzle_inlet', mesh_name: 'pv_nozzle_inlet', metrics: ['flow_rate', 'audio'] },
            { component: 'nozzle_outlet', mesh_name: 'pv_nozzle_outlet', metrics: ['flow_rate', 'audio'] },
            { component: 'weld_seam', mesh_name: 'pv_weld_seam', metrics: ['pressure_cycles', 'audio'] },
            { component: 'support', mesh_name: 'pv_support', metrics: ['vibration', 'audio'] }
        ];
        const fallbackPositions = getFallbackPositions(comps.length || 3, modelBox);

        comps.forEach((comp, idx) => {
            const metrics = (comp.metrics || []).map((m) => String(m).toLowerCase());
            const isActive = metric ? metrics.includes(metric) : false;
            const mesh = findMesh(comp.mesh_name);
            if (mesh && mesh.material) {
                if (isActive) {
                    mesh.material.color.setHex(0xffb020);
                    if (mesh.material.emissive) {
                        mesh.material.emissive.setHex(0x442200);
                    }
                }
            }

            const labelText = comp.component || comp.mesh_name || 'component';
            // Add a small marker on the mesh
            const markerGeo = new THREE.SphereGeometry(0.12, 20, 20);
            const markerMat = new THREE.MeshBasicMaterial({
                color: isActive ? 0xff3b30 : 0xffaa66,
                depthTest: false,
                depthWrite: false
            });
            const marker = new THREE.Mesh(markerGeo, markerMat);
            const pos = new THREE.Vector3();
            if (mesh) {
                new THREE.Box3().setFromObject(mesh).getCenter(pos);
            } else {
                const fallback = fallbackPositions[idx] || new THREE.Vector3(0, 0, 0);
                pos.copy(fallback);
            }
            marker.position.copy(pos);
            marker.userData.kind = 'marker';
            marker.userData.label = labelText.toUpperCase();
            if (latestReading) {
                marker.userData.metric = latestReading.type || '';
                marker.userData.value = `${latestReading.value}${latestReading.unit ? ` ${latestReading.unit}` : ''}`;
            }
            marker.renderOrder = 999;
            if (markerGroupRef.current) {
                markerGroupRef.current.add(marker);
            }

            // Label sprite
            const labelTextFull = `${labelText.toUpperCase()}  ${labelValue}`;
            const label = createLabelSprite(labelTextFull);
            label.position.copy(pos.clone().add(new THREE.Vector3(0, 0.25, 0)));
            label.userData.kind = 'label';
            label.renderOrder = 999;
            if (markerGroupRef.current) {
                markerGroupRef.current.add(label);
            }

            // Heat spot sprite
            const glow = createGlowSprite();
            glow.position.copy(pos);
            glow.userData.kind = 'glow';
            glow.userData.baseScale = 1.0;
            glow.userData.pulse = isActive ? 1.0 : 0.5;
            glow.renderOrder = 998;
            if (markerGroupRef.current) {
                markerGroupRef.current.add(glow);
            }

            // Arrow pointing to component
            const arrowStart = pos.clone().add(new THREE.Vector3(0, 0.35, 0));
            const arrow = createArrow(arrowStart, pos);
            arrow.userData.kind = 'arrow';
            if (markerGroupRef.current) {
                markerGroupRef.current.add(arrow);
            }
        });
    }, [components, activeMetric]);

    if (!modelFile) {
        return (
            <div className="h-full w-full flex items-center justify-center text-sm text-gray-300">
                No digital twin model mapped for this asset type.
            </div>
        );
    }

    const labelValue = latestReading
        ? `${latestReading.type}: ${latestReading.value}${latestReading.unit ? ` ${latestReading.unit}` : ''}`
        : 'No sensor data';

    const labelItems = (components.length > 0 ? components : [
        { component: 'shell' },
        { component: 'nozzle_inlet' },
        { component: 'nozzle_outlet' }
    ]).map((c) => c.component || c.mesh_name || 'component');
    const hotspotKey = normalizeAssetType(assetType, assetId);
    const hotspots = hotspotKey ? (hotspotMap[hotspotKey] || []) : [];

    return (
        <div className="relative h-full w-full">
            {loadError ? (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-red-300">
                    {loadError}
                </div>
            ) : null}
            {hoverLabel && (
                <div className="absolute top-3 right-3 bg-black text-white text-xs font-mono px-2 py-1 border border-white z-20">
                    {hoverLabel}
                </div>
            )}
            <div className="absolute top-3 left-3 bg-white/95 text-black text-xs font-mono px-3 py-3 border-2 border-black z-20 max-w-[260px]">
                <div className="font-black uppercase text-sm">{assetType || 'Asset'}</div>
                <div className="mt-1 text-gray-700">{labelValue}</div>
                <div className="mt-2 space-y-1">
                    {labelItems.slice(0, 6).map((label, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2">
                            <span className="uppercase">{label}</span>
                            <span className="font-bold">{labelValue}</span>
                        </div>
                    ))}
                </div>
                <div className="mt-2 text-[10px] text-gray-600">
                    Hotspots mapped: {labelItems.slice(0, 6).join(', ')}
                </div>
            </div>
            {hotspots.length > 0 && (
                <div className="absolute bottom-3 left-3 bg-white/95 text-black text-[10px] font-mono px-3 py-3 border-2 border-black z-20 max-w-[260px]">
                    <div className="font-bold uppercase mb-1">Hotspot Map</div>
                    {hotspots.slice(0, 3).map((h, idx) => (
                        <div key={idx} className="mb-2">
                            <div className="font-bold uppercase">{h.component}</div>
                            <div>Risk: {h.risk.join(', ')}</div>
                            <div>Data: {h.data.join(', ')}</div>
                            <div>Visual: {h.visual}</div>
                        </div>
                    ))}
                </div>
            )}
            <div ref={containerRef} className="absolute inset-0" />
            <div className="absolute inset-0 pointer-events-none z-30">
                {callouts.map((c) => (
                    <div
                        key={c.id}
                        style={{ left: c.x + 14, top: c.y - 12 }}
                        className="absolute flex items-center gap-2"
                    >
                        <div className="w-6 h-[2px] bg-[#12c8ff]"></div>
                        <div className="px-2 py-1 bg-[#0d2330] text-[#9be8ff] text-[10px] font-mono border border-[#12c8ff] rounded">
                            <div className="uppercase">{c.label}</div>
                            <div className="text-[9px] text-[#7ad7ff]">{c.metric} {c.value}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DigitalTwinViewer;
