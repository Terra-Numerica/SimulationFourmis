import * as THREE from 'three';
import Framework from '../framework/framework';

export default class Food {
    constructor(name, position){
        this.name = name;
        name = name.split("_")[0];
        if(name == "bread") position.y -= 1.5;
        this.position = position;
        this.radius = 3;
        this.quantity = 40;
        this.isBeingCarried = false;
        this.carrierAnt = null;
        this.visual = null;
    }

    growingRadius(){
        this.radius += 0.2;
    }

    decreaseQuantity(){
        this.quantity -= 1;
        //console.log(this.quantity);
    }

    updatePosition(antPosition) {
        if (this.isBeingCarried) {
            this.position = {
                x: antPosition.x,
                y: antPosition.y + 0.5, // Légèrement au-dessus de la fourmi
                z: antPosition.z
            };
            if (this.visual) {
                this.visual.position.set(this.position.x, this.position.y, this.position.z);
            }
        }
    }
}