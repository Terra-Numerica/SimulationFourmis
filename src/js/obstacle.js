import * as THREE from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export default class Obstacle {
    constructor(position, typeOfMug){
       this.name = typeOfMug
       this.position = position;
    }
}