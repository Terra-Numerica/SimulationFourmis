import { changeSpeedPlus, changeSpeedMinus } from './main.js';

// Control the Restart button with 'r' keypress
document.addEventListener('keypress', function(event) {
    if (event.key === 'r' || event.key === 'R') location.reload();
    if (event.key === '+') changeSpeedPlus();
    if (event.key === '-') changeSpeedMinus();
    //if (event.key === 'd' || event.key === 'D') changeDistancePlus();
    //if (event.key === 'f' || event.key === 'F') changeDistanceMinus();
});

