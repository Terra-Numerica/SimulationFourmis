import * as THREE from 'three';

import Ant from './ant.js';

export default class Loop {
    constructor(FirstAnt, start, finish, listPoints,listObstacle, modelAnt, fw){
        console.log("Loop created");
        this.fw = fw;

        this.name;
        this.antStart = FirstAnt;
        this.start = start;
        this.finish = finish;
        this.modelAnt = modelAnt;
        this.listP = listPoints;
        this.listA = [];
        this.listA.push(FirstAnt);
        this.MaxAnt = 50;
        this.MaxWanderingAnt = 20;
        this.listO = listObstacle;
        this.counter = 1 + FirstAnt.number * 1000;
        console.log(this.listO.length);
        
        this.typeOfLoop;
        this.intervallLaunched = false;
        this.maxPath = 200;
        this.listF = [];

        this.listLoop = [];
        this.stop = false;
        this.deleteLoop = false;
        this.foodToEat = null;
    }

    launchLoop(scene){
        switch(this.typeOfLoop){
            case 'normal':
                //console.log("Normal loop launched");
                this.mainLoop(scene);
                break;
            case 'wander':
                this.wanderLoop(scene);
                this.intervallLaunched = true; 
                break;
            default:
                console.log("Error: type of loop not defined");
                break;
        }
    }

    async mainLoop(scene){
        //Follow the path
        this.updateAnt();
        if(this.listP.length > 0){
            this.listA[0].followN(this.listP[0].x, this.listP[0].y, this.listP[0].z, scene);
            if(this.listA[0].position.x == this.listP[0].x  && this.listA[0].position.z == this.listP[0].z && this.listA[0].position.y == this.listP[0].y){
                this.listP.shift();
            }
            await this.actionForAnt(scene);
            
            // Mise à jour des phéromones pour toutes les fourmis
            this.listA.forEach(ant => ant.updatePheromones(scene));
        }
        //Follow the previous ant created
        else{
            await this.actionForAnt(scene);
            
            // Mise à jour des phéromones pour toutes les fourmis
            this.listA.forEach(ant => ant.updatePheromones(scene));
        }
    };

    async actionForAnt(scene){
        if(!this.stop) await this.addAnt(scene);
        this.updateAnt();
        this.follow(scene);
        for(var i =0; i < this.listA.length; i++){this.deleteAnt(i,scene);}
        if(this.listA.length <= 0){
            this.deleteLoop = true;
        }
    }

    async wanderLoop(scene){
        try {
            this.addAnt(scene);
            this.updateAnt();

            this.deleteFood(scene);

            if(!this.intervallLaunched){
                this.launchIntervall(); 
            }

            for(let i = 0; i < this.listA.length; i++){
                const ant = this.listA[i];
                
                if(!ant) continue;
                
                if(ant.pathTaken.length >= this.maxPath){
                    ant.retracePath = true;
                }

                // Communication entre les fourmis
                ant.communicateWithOtherAnts(this.listA);

                // Détection améliorée de la nourriture
                const nearestFood = this.findNearestFood(ant);
                if (nearestFood && !nearestFood.isBeingCarried) {
                    const distance = ant.distance(nearestFood.position.x, nearestFood.position.y, nearestFood.position.z);
                    const pheromoneStrength = this.getPheromoneStrength(ant.position, 'food');
                    
                    if (distance <= 1 && !ant.eat) {
                        ant.foodEaten = nearestFood;
                        ant.retracePath = true;
                        ant.eat = true;
                        nearestFood.isBeingCarried = true;
                        nearestFood.carrierAnt = ant;
                        ant.updatePheromones(scene);
                    } else if (distance < nearestFood.radius && !ant.retracePath) {
                        const direction = this.calculateDirection(ant, nearestFood, pheromoneStrength);
                        ant.targetDirection = direction;
                    }
                }

                if(!ant.loopLaunched){
                    ant.wander(scene);
                }
                
                ant.updatePheromones(scene);

                if(ant.eat && ant.pathTaken.length <= 1 && !ant.loopLaunched){
                    const finish = {x: ant.goodPath[ant.goodPath.length-1].x, y: ant.goodPath[ant.goodPath.length-1].y, z: ant.goodPath[ant.goodPath.length-1].z};
                    const start = {x: ant.goodPath[0].x, y: ant.goodPath[0].y, z: ant.goodPath[0].z};
                    
                    const newLoop = new Loop(ant, start, finish, ant.goodPath, this.listO, this.modelAnt, this.fw);
                    newLoop.typeOfLoop = 'normal';
                    newLoop.name = "loop"+ant.number;
                    newLoop.foodToEat = ant.foodEaten;
                    
                    this.listLoop.push(newLoop);
                    ant.loopLaunched = true;
                }

                // Gestion des sous-boucles
                if(this.listLoop.length > 0){
                    for(let l = 0; l < this.listLoop.length; l++){
                        const subLoop = this.listLoop[l];
                        if(!subLoop) continue;
                        
                        subLoop.launchLoop(scene);
                        if(subLoop.deleteLoop){
                            this.handleLoopDeletion(subLoop, l);
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error in wanderLoop:", error);
        }
    }

    handleLoopDeletion(loop, index) {
        console.log("Loop deleted");
        for(let a = 0; a < this.MaxWanderingAnt; a++){
            if(loop.antStart.number === this.listA[a]?.number){
                const ant = this.listA[a];
                ant.position = {x: this.start.x, y: this.start.y+0.5, z: this.start.z};
                ant.pathTaken = [];
                ant.goodPath = [];
                ant.pathTaken.push({x: this.start.x, y: this.start.y, z: this.start.z});
                
                ant.arrived = false;
                ant.eat = false;
                ant.foodEaten = null;
                ant.retracePath = false;
                ant.loopLaunched = false;
            }
        }
        this.listLoop.splice(index, 1);
    }

    deleteFood(scene){
        for(var f = 0; f < this.listF.length; f++){
            if(this.listF[f].quantity <= 0){
                var wait = false;
                
                for(var l = 0; l < this.listLoop.length; l++){
                    if(this.listLoop[l].foodToEat.name == this.listF[f].name){
                        wait = true;
                    }
                }
                if(!wait){
                    console.log('Food deleted');
                    scene.remove(scene.getObjectByName(this.listF[f].name));
                    this.listF.splice(f,1);
                }
            }
        }
    }

    launchIntervall(){
        setInterval(() => {
            for(var i = 0; i < this.listA.length; i++){
                const ant = this.listA[i];
                
                if(ant.pathTaken.length < this.maxPath && !ant.eat){
                    // Génération d'une direction aléatoire plus naturelle
                    const angle = Math.random() * Math.PI * 2;
                    const distance = Math.random() * 20 + 10;
                    const offsetX = Math.cos(angle) * distance;
                    const offsetZ = Math.sin(angle) * distance;
                    
                    // Limites de la scène
                    const boundedX = Math.max(-24, Math.min(24, offsetX));
                    const boundedZ = Math.max(-24, Math.min(24, offsetZ));
                    
                    ant.targetDirection = {x: boundedX, y: 0, z: boundedZ};
                }
            }
        }, 500);
    }

    follow(scene){
        if(this.listP.length <= 1){
            this.listA[0].followN(this.finish.x, this.finish.y, this.finish.z, scene);
        }
        for(var i = 1; i < this.listA.length; i++){
            this.listA[i].followPrevious(this.listA[i-1],this.listO, scene); 
        }
    }

    deleteAnt(i,scene){
        if(this.listA[i].type != "Wandering"){
            if(this.listA[i].distance(this.finish.x, this.finish.y, this.finish.z) < 0.1){
                this.fw.delete_copy("ant_copy"+this.listA[i].number);
                this.listA.splice(i,1);
            }
        }
        else{
            if(this.listA[i].distance(this.finish.x, this.finish.y, this.finish.z) < 0.1){
                this.listA.splice(i,1);
            }
        }
    }

    async addAnt(){
        if(this.typeOfLoop == 'normal'){
            if(this.listA.length < this.MaxAnt && this.listA[this.listA.length-1].distance(this.start.x, this.start.y, this.start.z) > 4){
                this.listA.push(new Ant(this.start.x, this.start.y +0.5, this.start.z, this.modelAnt, this.fw));
                await this.listA[this.listA.length-1].createAnt(this.counter);
                this.counter++;
                if(this.foodToEat != null){
                    this.foodToEat.decreaseQuantity();
                    if(this.foodToEat.quantity <= 0){
                        this.stop = true;
                    }
                }
            }
        }

        else{
            if(this.listA.length < this.MaxWanderingAnt && this.listA[this.listA.length-1].distance(this.start.x, this.start.y, this.start.z) > 4){
                var ant = new Ant(this.start.x, this.start.y +0.5, this.start.z,this.modelAnt, this.fw);
                this.listA.push(ant);
                await ant.createAnt(this.counter);
                this.counter++;
                ant.type = "Wandering";
            }
        }
    }

    updateAnt(){
        for(var i = 0; i < this.listA.length; i++){
            this.listA[i].updateParameter();
        }
    }

    findNearestFood(ant) {
        let nearest = null;
        let minDistance = Infinity;
        
        for (const food of this.listF) {
            const distance = ant.distance(food.position.x, food.position.y, food.position.z);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = food;
            }
        }
        
        return nearest;
    }

    getPheromoneStrength(position, type) {
        let strength = 0;
        let count = 0;
        
        for (const ant of this.listA) {
            for (const pheromone of ant.pheromones) {
                if (pheromone.type === type) {
                    const distance = Math.sqrt(
                        Math.pow(position.x - pheromone.position.x, 2) +
                        Math.pow(position.y - pheromone.position.y, 2) +
                        Math.pow(position.z - pheromone.position.z, 2)
                    );
                    if (distance < 5) {
                        strength += pheromone.intensity;
                        count++;
                    }
                }
            }
        }
        
        return count > 0 ? strength / count : 0;
    }

    calculateDirection(ant, food, pheromoneStrength) {
        const dx = food.position.x - ant.position.x;
        const dz = food.position.z - ant.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Influence des phéromones sur la direction
        const pheromoneInfluence = pheromoneStrength * 0.5;
        
        return {
            x: ant.position.x + (dx / distance) * (1 + pheromoneInfluence),
            y: 0,
            z: ant.position.z + (dz / distance) * (1 + pheromoneInfluence)
        };
    }
}