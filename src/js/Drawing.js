import * as THREE from 'three';

export default class Drawing {
    constructor(){
        this.drawing = false;
        this.canDraw = true;
        this.listPoints = [];
        this.listLine = [];
    }

    drawLine(scene){
        if(this.listPoints.length > 1){
            var material = new THREE.LineBasicMaterial({color: 0x0000ff, linewidth: 10});
            var curve = new THREE.CatmullRomCurve3(this.listPoints);
            var points = curve.getPoints(1000);
            var geometry = new THREE.BufferGeometry().setFromPoints(points);
            var line = new THREE.Line(geometry, material);
            this.listLine.push(line);
            scene.add(line);
        }
    }

    deleteLine(scene){
        if(this.listLine.length > 0){
            scene.remove(this.listLine.pop());
        }
    }

    addPoint(point){
        if(this.canDraw){
            this.listPoints.push(point);
        }
    }


}