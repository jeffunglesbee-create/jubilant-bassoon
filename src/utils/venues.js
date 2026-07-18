// Venue coordinates + outdoor/indoor classification. [lat, lon, isOutdoor]

export const VENUE_COORDS = {
  // MLB outdoor ──────────────────────────────────────────────────────────────
  "Fenway Park":                           [42.3467, -71.0972,  true],
  "Fenway Park, Boston":                   [42.3467, -71.0972,  true],
  "Yankee Stadium":                        [40.8296, -73.9262,  true],
  "Coors Field":                           [39.7559, -104.9942, true],
  "Wrigley Field":                         [41.9484, -87.6553,  true],
  "Oracle Park":                           [37.7786, -122.3893, true],
  "Oracle Park, San Francisco":            [37.7786, -122.3893, true],
  "Dodger Stadium":                        [34.0739, -118.2400, true],
  "Dodger Stadium, Los Angeles":           [34.0739, -118.2400, true],
  "Busch Stadium":                         [38.6226, -90.1928,  true],
  "Nationals Park":                        [38.8730, -77.0074,  true],
  "Citizens Bank Park":                    [39.9061, -75.1665,  true],
  "Citizens Bank Park, Philadelphia":      [39.9061, -75.1665,  true],
  "Great American Ball Park":              [39.0979, -84.5069,  true],
  "Great American Ball Park, Cincinnati":  [39.0979, -84.5069,  true],
  "Kauffman Stadium":                      [39.0517, -94.4803,  true],
  "Kauffman Stadium, Kansas City":         [39.0517, -94.4803,  true],
  "Comerica Park":                         [42.3390, -83.0485,  true],
  "Petco Park":                            [32.7076, -117.1570, true],
  "Petco Park, San Diego":                 [32.7076, -117.1570, true],
  "Oriole Park, Baltimore":                [39.2838, -76.6218,  true],
  "Guaranteed Rate Field":                 [41.8300, -87.6339,  true],
  "Guaranteed Rate Field, Chicago":        [41.8300, -87.6339,  true],
  "Angels Stadium":                        [33.8003, -117.8827, true],
  "loanDepot park":                        [25.7781, -80.2195,  true],
  "loanDepot park, Miami":                 [25.7781, -80.2195,  true],
  "Progressive Field, Cleveland":          [41.4962, -81.6852,  true],
  // MLB retractable-roof / dome → false ─────────────────────────────────────
  "Globe Life Field":                      [32.7512, -97.0832,  false],
  "Globe Life Field, Arlington":           [32.7512, -97.0832,  false],
  "Chase Field":                           [33.4453, -112.0667, false],
  "Chase Field, Phoenix":                  [33.4453, -112.0667, false],
  "American Family Field":                 [43.0284, -87.9712,  false],
  "American Family Field, Milwaukee":      [43.0284, -87.9712,  false],
  "Minute Maid Park":                      [29.7573, -95.3555,  false],
  "T-Mobile Park":                         [47.5914, -122.3325, false],
  "Tropicana Field":                       [27.7682, -82.6534,  false],
  "Rogers Centre, Toronto":                [43.6414, -79.3894,  false],
  // MLS / Soccer outdoor ─────────────────────────────────────────────────────
  "Gillette Stadium, Foxboro":             [42.0909, -71.2643,  true],
  "Red Bull Arena, Harrison NJ":           [40.7369, -74.1502,  true],
  "Children's Mercy Park, Kansas City":   [39.1212, -94.8233,  true],
  "CityPark, St. Louis":                   [38.6328, -90.2023,  true],
  "America First Field, Sandy UT":         [40.5830, -111.8927, true],
  "Snapdragon Stadium, San Diego":         [32.7532, -117.1214, true],
  "Stade Saputo, Montreal":                [45.5636, -73.5518,  true],
  "BMO Field, Toronto":                    [43.6333, -79.4186,  true],
  // MLS stadiums
  "Chase Stadium, Fort Lauderdale FL":    [26.1947, -80.1506,  true],
  "Chase Stadium, Fort Lauderdale":       [26.1947, -80.1506,  true],
  "Red Bull Arena, Harrison NJ":          [40.7367, -74.1503,  true],
  "Red Bull Arena, Harrison":             [40.7367, -74.1503,  true],
  "Subaru Park, Chester PA":              [39.8334, -75.3808,  true],
  "Subaru Park, Chester":                 [39.8334, -75.3808,  true],
  "Gillette Stadium, Foxboro MA":         [42.0909, -71.2643,  true],
  "Bank of America Stadium, Charlotte":   [35.2259, -80.8529,  true],
  "Audi Field, Washington DC":            [38.8695, -77.0125,  true],
  "Lower.com Field, Columbus OH":         [39.9690, -83.0154,  true],
  "Lower.com Field, Columbus":            [39.9690, -83.0154,  true],
  "TQL Stadium, Cincinnati OH":           [39.1051, -84.5182,  true],
  "TQL Stadium, Cincinnati":              [39.1051, -84.5182,  true],
  "Inter&Co Stadium, Orlando FL":         [28.5415, -81.3893,  true],
  "Inter&Co Stadium, Orlando":            [28.5415, -81.3893,  true],
  "GEODIS Park, Nashville TN":            [36.1307, -86.7665,  true],
  "GEODIS Park, Nashville":               [36.1307, -86.7665,  true],
  "Soldier Field, Chicago IL":             [41.8623, -87.6167,  true],
  "Soldier Field, Chicago":               [41.8623, -87.6167,  true],
  "CITYPARK, St. Louis":                  [38.6317, -90.2016,  true],
  "CityPark, St. Louis MO":               [38.6317, -90.2016,  true],
  "Allianz Field, St. Paul MN":           [44.9530, -93.1649,  true],
  "Allianz Field, St. Paul":              [44.9530, -93.1649,  true],
  "BMO Stadium, Los Angeles CA":          [34.0130, -118.2845, true],
  "BMO Stadium, Los Angeles":             [34.0130, -118.2845, true],
  "Dignity Health Sports Park, Carson CA":[33.8643, -118.2611, true],
  "Dignity Health Sports Park, Carson":   [33.8643, -118.2611, true],
  "Dignity Health Sports Park":           [33.8643, -118.2611, true],
  "Lumen Field, Seattle WA":              [47.5952, -122.3316, true],
  "Lumen Field, Seattle":                 [47.5952, -122.3316, true],
  "Providence Park, Portland OR":         [45.5215, -122.6917, true],
  "Providence Park, Portland":            [45.5215, -122.6917, true],
  "PayPal Park, San Jose CA":             [37.3519, -121.9254, true],
  "PayPal Park, San Jose":                [37.3519, -121.9254, true],
  "America First Field, Sandy UT":        [40.5830, -111.8932, true],
  "America First Field, Sandy":           [40.5830, -111.8932, true],
  "Dick's Sporting Goods Park, Commerce City":[39.8057,-104.8919,true],
  "Dick's Sporting Goods Park":          [39.8057, -104.8919, true],
  "Q2 Stadium, Austin TX":                [30.3872, -97.7180,  true],
  "Q2 Stadium, Austin":                   [30.3872, -97.7180,  true],
  "Shell Energy Stadium, Houston TX":     [29.7523, -95.3511,  true],
  "Shell Energy Stadium, Houston":        [29.7523, -95.3511,  true],
  "Children's Mercy Park, Kansas City":  [39.1225, -94.8239,  true],
  "Children's Mercy Park":               [39.1225, -94.8239,  true],
  "Toyota Stadium, Frisco TX":            [33.1545, -96.8353,  true],
  "Toyota Stadium, Frisco":               [33.1545, -96.8353,  true],
  "Snapdragon Stadium, San Diego CA":     [32.7831, -117.1199, true],
  "Snapdragon Stadium, San Diego":        [32.7831, -117.1199, true],
  "Stade Saputo, Montreal QC":            [45.5640, -73.5518,  true],
  "Stade Saputo, Montreal":               [45.5640, -73.5518,  true],
  "Mercedes-Benz Stadium, Atlanta":        [33.7555, -84.4010,  false],
  "BC Place, Vancouver":                   [49.2768, -123.1118, false],
  // EPL / European Soccer ────────────────────────────────────────────────────
  "Anfield, Liverpool":                    [53.4308, -2.9608,   true],
  "Etihad Stadium, Manchester":            [53.4831, -2.2004,   true],
  "Craven Cottage, London":                [51.4749, -0.2218,   true],
  "Amex Stadium, Brighton":                [50.8619, -0.0831,   true],
  "Stadium of Light, Sunderland":          [54.9147, -1.3882,   true],
  "Villa Park, Birmingham":                [52.5090, -1.8847,   true],
  "Turf Moor, Burnley":                    [53.7889, -2.2302,   true],
  "Selhurst Park, London":                 [51.3983, -0.0855,   true],
  "City Ground, Nottingham":               [52.9401, -1.1326,   true],
  "Riverside Stadium, Middlesbrough":      [54.5785, -1.2170,   true],
  "St Mary's Stadium, Southampton":       [50.9058, -1.3910,   true],
  "MKM Stadium, Hull":                     [53.7463, -0.3674,   true],
  "The Den, London":                       [51.4851, -0.0509,   true],
  "London Stadium":                        [51.5386, -0.0163,   true],
  "Allianz Arena, Munich":                 [48.2188, 11.6247,   true],
  "Europa-Park Stadion, Freiburg":         [48.0221, 7.8275,    true],
  "Stade de la Meinau, Strasbourg":        [48.5601, 7.7534,    true],
  // AFL ──────────────────────────────────────────────────────────────────────
  "MCG, Melbourne":                        [-37.8200, 144.9834, true],
  "Melbourne Cricket Ground":              [-37.8200, 144.9834, true],
  "ENGIE Stadium, Sydney":                 [-33.8472, 151.0635, true],
  "TIO Stadium, Darwin":                   [-12.4170, 130.8694, true],
  "People First Stadium, Gold Coast":      [-28.0056, 153.4028, true],
  "Marvel Stadium, Melbourne":             [-37.8169, 144.9479, false],
  // Tennis / Cricket ─────────────────────────────────────────────────────────
  "Foro Italico, Rome":                    [41.9339, 12.4672,   true],
  "Rajiv Gandhi International Stadium, Hyderabad": [17.4046, 78.5480, true],
  "Sawai Mansingh Stadium, Jaipur":        [26.8952, 75.8068,   true],
  // ── Golf ──────────────────────────────────────────────────────────────────
  "Quail Hollow Club, Charlotte":          [35.0527, -80.8328,  true],   // Truist Championship
  "Aronimink Golf Club":                   [39.9654, -75.4165,  true],   // 2026 PGA Championship
  "Augusta National Golf Club":            [33.5024, -82.0238,  true],   // Masters
  "Pinehurst No. 2":                       [35.1946, -79.4657,  true],   // US Open
  "Pebble Beach Golf Links":               [36.5683, -121.9478, true],   // AT&T / US Open
  "TPC Sawgrass":                          [30.1975, -81.3957,  true],   // The Players
  "Riviera Country Club":                  [34.0397, -118.5085, true],   // Genesis Invitational
  "Torrey Pines South Course":             [32.8971, -117.2519, true],   // Farmers Insurance
  "Harbour Town Golf Links":               [32.1380, -80.6686,  true],   // RBC Heritage
  "TPC Scottsdale":                        [33.6606, -111.8926, true],   // WM Phoenix Open
  "Muirfield Village Golf Club":           [40.1034, -83.0685,  true],   // Memorial Tournament
  "East Lake Golf Club":                   [33.7115, -84.2896,  true],   // TOUR Championship
  "St Andrews Links Old Course":           [56.3435, -2.8013,   true],   // The Open Championship
  "Royal Troon Golf Club":                 [55.5333, -4.6667,   true],   // The Open Championship
  "Royal St George's Golf Club":           [51.2010, 1.3880,    true],   // The Open Championship
  "Dunes Golf and Beach Club":             [33.7490, -78.8138,  true],   // Myrtle Beach Classic
  "Colonial Country Club":                 [32.7247, -97.3592,  true],   // Charles Schwab Challenge
};

export function isOutdoorVenue(venue){
  if(!venue) return false;
  if(VENUE_COORDS[venue] !== undefined) return VENUE_COORDS[venue][2];
  for(const [key, v] of Object.entries(VENUE_COORDS)){
    const keyBase = key.split(',')[0];
    const venBase = venue.split(',')[0];
    if(venue.includes(keyBase) || key.includes(venBase)) return v[2];
  }
  return false;
}

export function getVenueCoords(venue){
  if(!venue) return null;
  if(VENUE_COORDS[venue]) return VENUE_COORDS[venue][2] ? [VENUE_COORDS[venue][0], VENUE_COORDS[venue][1]] : null;
  for(const [key, v] of Object.entries(VENUE_COORDS)){
    const keyBase = key.split(',')[0];
    const venBase = venue.split(',')[0];
    if(venue.includes(keyBase) || key.includes(venBase)) return v[2] ? [v[0], v[1]] : null;
  }
  return null;
}
