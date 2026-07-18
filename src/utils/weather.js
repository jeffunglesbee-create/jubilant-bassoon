// Weather classification and formatting utilities.

export function wxDescription(wx){
  if((wx.rain||0)>5||(wx.precip||0)>5) return `Heavy rain · ${wx.temp}°F`;
  if((wx.rain||0)>1||(wx.precip||0)>1) return `Rain · ${wx.temp}°F`;
  if((wx.snowfall||0)>0.3) return `Snow · ${wx.temp}°F`;
  if((wx.gusts||wx.wind||0)>25) return `Windy · ${wx.temp}°F`;
  if(wx.temp < 32) return `Cold · ${wx.temp}°F`;
  if(wx.temp > 95) return `Hot · ${wx.temp}°F`;
  return `${wx.temp}°F`;
}

export function wxIcon(wx){
  if((wx.snowfall||0)>0.3) return '❄️';
  if((wx.rain||0)>5||(wx.precip||0)>5) return '⛈️';
  if((wx.rain||0)>1||(wx.precip||0)>1) return '🌧️';
  if((wx.aqi||0)>150) return '🌫️';
  if((wx.gusts||wx.wind||0)>25) return '💨';
  if(wx.temp < 32) return '🌡️';
  if(wx.temp > 95) return '☀️';
  return wx.isDay ? '⛅' : '🌙';
}

export function wxAlert(wx){
  return (wx.rain||0) > 5
      || (wx.gusts||wx.wind||0) > 30
      || wx.temp < 28
      || wx.temp > 100
      || (wx.snowfall||0) > 0.5
      || (wx.aqi||0) > 150;
}

export function weatherDramaModifier(wx){
  if(!wx) return 0;
  let mod = 0;
  const feels = wx.feelsLike !== undefined ? wx.feelsLike : wx.temp;
  const gusts  = wx.gusts || wx.wind || 0;
  if(feels < 0)           mod += 8;
  if(feels < 28)          mod += 8;
  if(gusts > 20)          mod += 6;
  if(gusts > 30)          mod += 4;
  if((wx.snowfall||0)>0.5) mod += 10;
  if((wx.rain||0)>2)      mod += 8;
  if((wx.precip||0)>5)    mod += 4;
  if((wx.aqi||0)>150)     mod -= 15;
  if((wx.aqi||0)>200)     mod -= 10;
  return mod;
}
