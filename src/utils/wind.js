// Cardinal direction lookup — 16-point compass from bearing degrees.

export const WX_DIR = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];

export function cardinalDir(deg){ return WX_DIR[Math.round(((deg%360)+360)%360/22.5)%16]; }
