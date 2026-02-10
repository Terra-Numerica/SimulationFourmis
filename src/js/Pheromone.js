import * as THREE from 'three';

export default class Pheromone {
    constructor(position, type = 'food') {
        this.position = position;
        this.type = type; // 'food' ou 'return'
        this.intensity = 1.0;
        this.evaporationRate = 0.01;
        this.diffusionRate = 0.1;
        this.createdAt = Date.now();
        this.particles = null;
    }

    createParticleSystem(scene) {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        // Couleur différente selon le type de phéromone
        const color = this.type === 'food' ? new THREE.Color(0, 1, 0) : new THREE.Color(1, 0, 0);
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = this.position.x + (Math.random() - 0.5) * 2;
            positions[i * 3 + 1] = this.position.y + (Math.random() - 0.5) * 2;
            positions[i * 3 + 2] = this.position.z + (Math.random() - 0.5) * 2;
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.6
        });

        this.particles = new THREE.Points(geometry, material);
        scene.add(this.particles);
    }

    update() {
        const age = Date.now() - this.createdAt;
        
        // Évaporation
        this.intensity -= this.evaporationRate;
        
        // Diffusion
        this.diffuse();
        
        if (this.particles) {
            this.particles.material.opacity = 0.6 * this.intensity;
        }

        return this.intensity > 0;
    }

    diffuse() {
        // Simulation simple de diffusion
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i] += (Math.random() - 0.5) * this.diffusionRate;
                positions[i + 1] += (Math.random() - 0.5) * this.diffusionRate;
                positions[i + 2] += (Math.random() - 0.5) * this.diffusionRate;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    remove(scene) {
        if (this.particles) {
            scene.remove(this.particles);
        }
    }
} 