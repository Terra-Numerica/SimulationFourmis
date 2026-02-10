import * as THREE from 'three';
import Framework from '../framework/framework';
import Pheromone from './Pheromone';

export let antSettings = {
    speed: 0.2,
    minDistance: 4,
    pheromoneInterval: 500, // Intervalle entre chaque dépôt de phéromone
    animationSpeed: 0.1, // Vitesse de l'animation
    explorationRadius: 30,
    foodDetectionRadius: 5,
    communicationRadius: 10
};

export default class Ant{
    position = {x:0, y:0, z:0};
    speed = antSettings.speed;
    modelSize = 0.015;
    minDistance = antSettings.minDistance;
    targetDirection = {x:0, y:0, z:0};
    pathTaken = [];
    retracePath = false;
    callback = true;
    goodPath = [];
    arrived = false;
    eat = false;
    loopLaunched = false;
    foodEaten = null;
    type = "";
    fw = null;
    lastPheromoneTime = 0;
    pheromones = [];
    currentRotation = 0;
    targetRotation = 0;
    animationPhase = 0;
    explorationPhase = 0;

    constructor(x,y,z, model, fw){
        console.log('Ant constructor');
        this.position = {x:x, y:y, z:z};
        this.fw = fw;
        this.explorationPhase = Math.random() * Math.PI * 2;
    }

    async createAnt(counter){
        console.log('createAnt');
        var ant = await this.fw.create_copy("ant", 0.015, 200, counter);
        ant.position.set(this.position.x, this.position.y+20, this.position.z );
        this.number = ant.name.split("ant_copy")[1];
        return ant;
    }

    distance(x,y,z){
        var dx = x - this.position.x;
        var dy = y - this.position.y;
        var dz = z - this.position.z;
        return Math.sqrt(dx*dx + dy*dy + dz*dz);
    }

    followN(x,y,z,scene){
        var dx = x - this.position.x;
        var dy = y - this.position.y;
        var dz = z - this.position.z;
        var speedX, speedY, speedZ;

        var maxDistance = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));

        if(maxDistance > this.speed){
            speedX = dx * this.speed / maxDistance;
            speedY = dy * this.speed / maxDistance;
            speedZ = dz * this.speed / maxDistance;
        }
        else{
            speedX = dx;
            speedY = dy;
            speedZ = dz;
        }

        this.position.x += speedX;
        this.position.y += speedY;
        this.position.z += speedZ;
        var ant = scene.getObjectByName("ant_copy"+this.number);
        
        var direction = new THREE.Vector3(x, y+0.5, z);
        ant.position.set(this.position.x, this.position.y+0.5, this.position.z);
        this.rotateModel(ant, direction);
    }

    followPrevious(ant,listO, scene){
        var dx = ant.position.x - this.position.x;
        var dy = ant.position.y - this.position.y;
        var dz = ant.position.z - this.position.z;
        var speedX, speedY, speedZ;
        var distanceToAnt = this.distance(ant.position.x, ant.position.y, ant.position.z);
        if(distanceToAnt < this.minDistance){
            speedX = 0;
            speedY = 0;
            speedZ = 0;
        }
        else{
            var maxDistance = Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz));
            if(maxDistance > this.speed){
                speedX = dx * this.speed / maxDistance;
                speedY = dy * this.speed / maxDistance;
                speedZ = dz * this.speed / maxDistance;
            }
            else{
                speedX = dx;
                speedY = dy;
                speedZ = dz;
            }

            speedX, speedY, speedZ = this.avoidObstacle(speedX, speedY, speedZ, listO);
        }

        this.position.x += speedX;
        this.position.y += speedY;
        this.position.z += speedZ;

        var ant = scene.getObjectByName("ant_copy"+this.number);
        // var direction = new THREE.Vector3(ant.position.x, ant.position.y, ant.position.z);
        var direction = new THREE.Vector3(0,10,0);
        ant.position.set(this.position.x, this.position.y+0.5, this.position.z);
        this.rotateModel(ant, direction);
    }

    rotateModel(ant3D, direction){
        // Calcul de la rotation cible
        const targetAngle = Math.atan2(direction.x, direction.z);
        this.targetRotation = targetAngle;
        
        // Animation fluide de la rotation
        const rotationDiff = this.targetRotation - this.currentRotation;
        this.currentRotation += rotationDiff * antSettings.animationSpeed;
        
        // Application de la rotation
        ant3D.rotation.y = this.currentRotation;

        // Animation de marche
        this.animationPhase += antSettings.animationSpeed;
        const legRotation = Math.sin(this.animationPhase) * 0.3;
        
        // Rotation des pattes (si le modèle a des pattes)
        if (ant3D.children) {
            ant3D.children.forEach(child => {
                if (child.name.includes('leg')) {
                    child.rotation.x = legRotation;
                }
            });
        }
    }

    wander(scene) {
        if (this.foodEaten) {
            // Si la fourmi transporte de la nourriture, la mettre à jour avec sa position
            this.foodEaten.updatePosition(this.position);
            
            // Si la fourmi est proche du nid, déposer la nourriture
            const distanceToNest = this.distance(0, 0, 0);
            if (distanceToNest < 2) {
                this.foodEaten.isBeingCarried = false;
                this.foodEaten.carrierAnt = null;
                this.foodEaten = null;
                this.eat = false;
                this.retracePath = false;
                this.loopLaunched = false;
                return;
            }
        }

        if(this.retracePath){
            this.followN(this.pathTaken[this.pathTaken.length-1].x, this.pathTaken[this.pathTaken.length-1].y, this.pathTaken[this.pathTaken.length-1].z, scene);
            if(this.distance(this.pathTaken[this.pathTaken.length-1].x, this.pathTaken[this.pathTaken.length-1].y, this.pathTaken[this.pathTaken.length-1].z) < 0.1 && this.pathTaken.length > 1){
                this.pathTaken.pop();    
            }
            if((this.pathTaken.length <= 1 && !this.arrived)|| !this.callback){
                this.arrived = true;
            }
        }
        else{
            // Utiliser la direction cible définie par launchIntervall
            const targetX = this.targetDirection.x;
            const targetZ = this.targetDirection.z;
            
            // Ajouter un peu de bruit pour un mouvement plus naturel
            const noise = this.generatePerlinNoise(this.position.x, this.position.z);
            const noisyX = targetX + noise.x * 2;
            const noisyZ = targetZ + noise.z * 2;
            
            // Limites de la scène
            const boundedX = Math.max(-24, Math.min(24, noisyX));
            const boundedZ = Math.max(-24, Math.min(24, noisyZ));
            
            this.followN(boundedX, this.position.y, boundedZ, scene);
            this.addToPathTaken(this.position.x, this.position.y, this.position.z);
        }
    }

    generatePerlinNoise(x, z) {
        // Simulation simple de bruit de Perlin
        return {
            x: Math.sin(x * 0.1) * Math.cos(z * 0.1),
            z: Math.cos(x * 0.1) * Math.sin(z * 0.1)
        };
    }

    addToPathTaken(x,y,z){
        if(this.pathTaken.length <= 0){
            this.pathTaken.push({x:x, y:y, z:z});
            this.goodPath.push({x:x, y:y, z:z});
        }
        if(this.pathTaken[this.pathTaken.length-1].x != x &&
            this.pathTaken[this.pathTaken.length-1].z != z &&
            (Math.abs(this.pathTaken[this.pathTaken.length-1].x - x) > 4 ||
            Math.abs(this.pathTaken[this.pathTaken.length-1].z - z) > 4)){
            this.pathTaken.push({x:x, y:y, z:z});
            this.goodPath.push({x:x, y:y, z:z});
        } 
    }

    avoidObstacle(sX, sY, sZ, listO){
        for(var i = 0; i < listO.length; i++){
            var dx = listO[i].position.x - this.position.x;
            var dz = listO[i].position.z - this.position.z;
            if(Math.abs(dx) < 2 && Math.abs(dz) < 2){
                if(dx < 0 && dz >= 0){
                    sX -= sX;
                    sZ = sZ;
                }
                else{
                    sX = dx;
                    sZ -= dz;
                }
            }
        }
        return sX, sY, sZ;
    }

    updateParameter(){
        this.speed = antSettings.speed;
        this.minDistance = antSettings.minDistance;
    }

    updatePheromones(scene) {
        const currentTime = Date.now();
        
        if (currentTime - this.lastPheromoneTime > antSettings.pheromoneInterval) {
            // Dépôt de phéromones selon le type
            const pheromoneType = this.eat ? 'return' : 'food';
            const pheromone = new Pheromone(this.position, pheromoneType);
            pheromone.createParticleSystem(scene);
            this.pheromones.push(pheromone);
            this.lastPheromoneTime = currentTime;
        }

        this.pheromones = this.pheromones.filter(pheromone => {
            const isAlive = pheromone.update();
            if (!isAlive) {
                pheromone.remove(scene);
            }
            return isAlive;
        });
    }

    findNearbyAnts(ants) {
        return ants.filter(ant => {
            if (ant === this) return false;
            return this.distance(ant.position.x, ant.position.y, ant.position.z) < antSettings.communicationRadius;
        });
    }

    communicateWithOtherAnts(ants) {
        if (!this.eat) return; // Seules les fourmis qui ont trouvé de la nourriture communiquent

        for (const otherAnt of ants) {
            if (otherAnt === this || otherAnt.eat) continue;

            const distance = this.distance(otherAnt.position.x, otherAnt.position.y, otherAnt.position.z);
            if (distance < antSettings.communicationRadius) {
                // Si l'autre fourmi est proche, elle suit la direction vers la nourriture
                if (this.foodEaten) {
                    otherAnt.targetDirection = {
                        x: this.foodEaten.position.x,
                        y: this.foodEaten.position.y,
                        z: this.foodEaten.position.z
                    };
                }
            }
        }
    }
}