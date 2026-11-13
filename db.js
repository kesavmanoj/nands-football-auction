// Nand's Football Auction — starter player database (prototype).
// Format: Name|Position|Prime club|League|Nation|Prime years|Rating (1–100, at prime)
// Ratings are first-pass estimates to be refined later.
(function (root) {
  var LEAGUES = { PL: 'Premier League', LL: 'LaLiga', SA: 'Serie A', BL: 'Bundesliga', L1: 'Ligue 1' };
  var RAW = [
    // Goalkeepers
    'Buffon|GK|Juventus|SA|ITA|2002–12|92', 'Casillas|GK|Real Madrid|LL|ESP|2005–12|91', 'Neuer|GK|Bayern Munich|BL|GER|2013–20|92',
    'Courtois|GK|Real Madrid|LL|BEL|2019–24|90', 'Alisson|GK|Liverpool|PL|BRA|2019–24|89', 'Van der Sar|GK|Manchester United|PL|NED|2006–10|88',
    'Čech|GK|Chelsea|PL|CZE|2004–11|89', 'Kahn|GK|Bayern Munich|BL|GER|1999–2002|90', 'Schmeichel|GK|Manchester United|PL|DEN|1993–99|90',
    'Ederson|GK|Manchester City|PL|BRA|2018–23|86', 'Oblak|GK|Atlético Madrid|LL|SVN|2016–21|89', 'Donnarumma|GK|Paris Saint-Germain|L1|ITA|2021–25|87',
    'Lloris|GK|Tottenham|PL|FRA|2014–19|85',
    // Right backs
    'Cafu|RB|AC Milan|SA|BRA|2001–05|89', 'Lahm|RB|Bayern Munich|BL|GER|2010–14|90', 'Dani Alves|RB|Barcelona|LL|BRA|2009–14|89',
    'Carvajal|RB|Real Madrid|LL|ESP|2016–24|86', 'Alexander-Arnold|RB|Liverpool|PL|ENG|2019–23|87', 'Zanetti|RB|Inter Milan|SA|ARG|1998–2010|88',
    'Hakimi|RB|Paris Saint-Germain|L1|MAR|2022–25|86', 'Gary Neville|RB|Manchester United|PL|ENG|1998–2005|83', 'Kyle Walker|RB|Manchester City|PL|ENG|2018–22|85',
    'Thuram|RB|Juventus|SA|FRA|2001–06|87', 'Kimmich|RB|Bayern Munich|BL|GER|2016–19|87', 'Salgado|RB|Real Madrid|LL|ESP|2000–05|82',
    // Centre backs
    'Maldini|CB|AC Milan|SA|ITA|1990–2005|94', 'Beckenbauer|CB|Bayern Munich|BL|GER|1970–76|94', 'Baresi|CB|AC Milan|SA|ITA|1988–94|93',
    'Cannavaro|CB|Juventus|SA|ITA|2004–06|91', 'Nesta|CB|AC Milan|SA|ITA|2002–07|91', 'Puyol|CB|Barcelona|LL|ESP|2005–11|89',
    'Sergio Ramos|CB|Real Madrid|LL|ESP|2012–18|91', 'Van Dijk|CB|Liverpool|PL|NED|2018–24|91', 'Terry|CB|Chelsea|PL|ENG|2004–10|88',
    'Ferdinand|CB|Manchester United|PL|ENG|2003–09|88', 'Vidić|CB|Manchester United|PL|SRB|2008–11|88', 'Piqué|CB|Barcelona|LL|ESP|2010–15|87',
    'Thiago Silva|CB|Paris Saint-Germain|L1|BRA|2013–18|89', 'Chiellini|CB|Juventus|SA|ITA|2012–17|88', 'Hummels|CB|Borussia Dortmund|BL|GER|2011–14|87',
    'Rúben Dias|CB|Manchester City|PL|POR|2020–23|87', 'Varane|CB|Real Madrid|LL|FRA|2014–20|86', 'Godín|CB|Atlético Madrid|LL|URU|2013–17|87',
    'Marquinhos|CB|Paris Saint-Germain|L1|BRA|2018–24|86', 'Kompany|CB|Manchester City|PL|BEL|2011–14|87',
    // Left backs
    'Roberto Carlos|LB|Real Madrid|LL|BRA|1997–2004|90', 'Marcelo|LB|Real Madrid|LL|BRA|2011–17|88', 'Ashley Cole|LB|Chelsea|PL|ENG|2006–11|87',
    'Evra|LB|Manchester United|PL|FRA|2007–11|85', 'Jordi Alba|LB|Barcelona|LL|ESP|2014–19|86', 'Alaba|LB|Bayern Munich|BL|AUT|2013–18|87',
    'Robertson|LB|Liverpool|PL|SCO|2018–22|86', 'Theo Hernández|LB|AC Milan|SA|FRA|2020–24|85', 'Alphonso Davies|LB|Bayern Munich|BL|CAN|2020–23|85',
    'Lizarazu|LB|Bayern Munich|BL|FRA|1998–2002|85', 'Zambrotta|LB|Juventus|SA|ITA|2002–06|84', 'Brehme|LB|Inter Milan|SA|GER|1988–91|86',
    // Right midfield
    'Beckham|RM|Manchester United|PL|ENG|1998–2002|87', 'Figo|RM|Real Madrid|LL|POR|2000–03|91', 'Robben|RM|Bayern Munich|BL|NED|2010–15|91',
    'Salah|RM|Liverpool|PL|EGY|2018–24|90', 'Bernardo Silva|RM|Manchester City|PL|POR|2019–23|86', 'Mahrez|RM|Manchester City|PL|ALG|2016–22|85',
    'Di María|RM|Paris Saint-Germain|L1|ARG|2015–20|87', 'Bale|RM|Real Madrid|LL|WAL|2013–17|88', 'Saka|RM|Arsenal|PL|ENG|2022–25|86',
    'Dembélé|RM|Paris Saint-Germain|L1|FRA|2024–25|88', 'Lamine Yamal|RM|Barcelona|LL|ESP|2024–25|87', 'Sterling|RM|Manchester City|PL|ENG|2018–20|86',
    // Central midfield
    'Zidane|CM|Real Madrid|LL|FRA|2000–06|95', 'Xavi|CM|Barcelona|LL|ESP|2008–12|92', 'Iniesta|CM|Barcelona|LL|ESP|2009–13|92',
    'Pirlo|CM|AC Milan|SA|ITA|2004–07|89', 'Gerrard|CM|Liverpool|PL|ENG|2004–09|90', 'Lampard|CM|Chelsea|PL|ENG|2005–10|89',
    'Scholes|CM|Manchester United|PL|ENG|2002–08|88', 'Roy Keane|CM|Manchester United|PL|IRL|1997–2002|88', 'Vieira|CM|Arsenal|PL|FRA|1999–2004|89',
    'Modrić|CM|Real Madrid|LL|CRO|2016–19|91', 'Kroos|CM|Real Madrid|LL|GER|2016–22|90', 'De Bruyne|CM|Manchester City|PL|BEL|2018–23|92',
    'Rodri|CM|Manchester City|PL|ESP|2022–24|91', 'Kaká|CM|AC Milan|SA|BRA|2006–08|92', 'Matthäus|CM|Inter Milan|SA|GER|1989–91|92',
    'Platini|CM|Juventus|SA|FRA|1983–86|93', 'Seedorf|CM|AC Milan|SA|NED|2002–07|87', 'Makélélé|CM|Chelsea|PL|FRA|2004–07|87',
    'Bellingham|CM|Real Madrid|LL|ENG|2023–25|89', 'Ballack|CM|Bayern Munich|BL|GER|2002–06|88',
    // Left midfield
    'Ribéry|LM|Bayern Munich|BL|FRA|2009–14|89', 'Ronaldinho|LM|Barcelona|LL|BRA|2004–06|94', 'Neymar|LM|Barcelona|LL|BRA|2014–17|91',
    'Hazard|LM|Chelsea|PL|BEL|2014–19|90', 'Giggs|LM|Manchester United|PL|WAL|1996–2002|86', 'Nedvěd|LM|Juventus|SA|CZE|2001–04|90',
    'Pires|LM|Arsenal|PL|FRA|2001–04|86', 'Vinícius Júnior|LM|Real Madrid|LL|BRA|2022–25|90', 'Mané|LM|Liverpool|PL|SEN|2018–22|89',
    'Son Heung-min|LM|Tottenham|PL|KOR|2019–23|87', 'Kvaratskhelia|LM|Napoli|SA|GEO|2022–24|86', 'Overmars|LM|Arsenal|PL|NED|1997–2000|85',
    // Strikers
    'Messi|ST|Barcelona|LL|ARG|2009–15|97', 'Cristiano Ronaldo|ST|Real Madrid|LL|POR|2011–17|96', 'Ronaldo Nazário|ST|Inter Milan|SA|BRA|1997–99|95',
    'Henry|ST|Arsenal|PL|FRA|2002–06|93', 'Shevchenko|ST|AC Milan|SA|UKR|2002–05|90', 'Lewandowski|ST|Bayern Munich|BL|POL|2017–21|92',
    'Benzema|ST|Real Madrid|LL|FRA|2019–22|90', 'Haaland|ST|Manchester City|PL|NOR|2022–25|91', 'Mbappé|ST|Paris Saint-Germain|L1|FRA|2018–24|92',
    'Van Basten|ST|AC Milan|SA|NED|1988–92|93', 'Batistuta|ST|Fiorentina|SA|ARG|1995–99|89', 'Drogba|ST|Chelsea|PL|CIV|2006–10|88',
    'Rooney|ST|Manchester United|PL|ENG|2007–12|88', 'Suárez|ST|Barcelona|LL|URU|2014–18|91', 'Ibrahimović|ST|Paris Saint-Germain|L1|SWE|2013–16|89',
    "Eto'o|ST|Barcelona|LL|CMR|2005–09|89", 'Kane|ST|Tottenham|PL|ENG|2016–22|90', 'Agüero|ST|Manchester City|PL|ARG|2013–18|89',
    'Raúl|ST|Real Madrid|LL|ESP|1999–2003|88', 'Gerd Müller|ST|Bayern Munich|BL|GER|1970–74|93',
    // Managers
    'Ferguson|MGR|Manchester United|PL|SCO|1998–2008|95', 'Guardiola|MGR|Barcelona|LL|ESP|2008–12|95', 'Mourinho|MGR|Chelsea|PL|POR|2004–07|92',
    'Ancelotti|MGR|Real Madrid|LL|ITA|2021–24|92', 'Klopp|MGR|Liverpool|PL|GER|2018–22|92', 'Sacchi|MGR|AC Milan|SA|ITA|1988–90|90',
    'Cruyff|MGR|Barcelona|LL|NED|1990–94|91', 'Wenger|MGR|Arsenal|PL|FRA|1998–2004|90', 'Zidane (manager)|MGR|Real Madrid|LL|FRA|2016–18|89',
    'Heynckes|MGR|Bayern Munich|BL|GER|2012–13|88', 'Simeone|MGR|Atlético Madrid|LL|ARG|2013–16|88', 'Lippi|MGR|Juventus|SA|ITA|1995–98|89',
    'Capello|MGR|AC Milan|SA|ITA|1992–96|88',
    // ---- Added so 4-3-3, 4-5-1 and 3-4-3 have enough top players at every position ----
    'Busquets|CM|Barcelona|LL|ESP|2009–15|88', 'Casemiro|CM|Real Madrid|LL|BRA|2016–22|88', 'Yaya Touré|CM|Manchester City|PL|CIV|2011–14|88',
    'Fàbregas|CM|Arsenal|PL|ESP|2008–11|87', 'Schweinsteiger|CM|Bayern Munich|BL|GER|2012–14|88',
    'Hierro|CB|Real Madrid|LL|ESP|1997–2002|88', 'Desailly|CB|AC Milan|SA|FRA|1994–98|89', 'Stam|CB|Manchester United|PL|NED|1998–2001|88',
    'Foden|RM|Manchester City|PL|ENG|2022–24|88', 'Coman|RM|Bayern Munich|BL|FRA|2019–22|86', 'Rodrygo|RM|Real Madrid|LL|BRA|2022–25|86', 'Cuadrado|RM|Juventus|SA|COL|2017–20|86',
    'Sané|LM|Manchester City|PL|GER|2018–20|86', 'Leão|LM|AC Milan|SA|POR|2022–24|86', 'Luis Díaz|LM|Liverpool|PL|COL|2022–25|86',
    // ---- Decent-but-not-great pool (rated 80-85): the occasional lucky last-tier pick ----
    'Joe Hart|GK|Manchester City|PL|ENG|2010–15|83', 'Pickford|GK|Everton|PL|ENG|2018–24|82', 'Reina|GK|Liverpool|PL|ESP|2007–12|84',
    'Glen Johnson|RB|Liverpool|PL|ENG|2009–14|81', 'Zabaleta|RB|Manchester City|PL|ARG|2011–15|83', 'Ivanović|RB|Chelsea|PL|SRB|2010–15|84', 'Sagna|RB|Arsenal|PL|FRA|2008–14|82',
    'Koscielny|CB|Arsenal|PL|FRA|2013–17|84', 'Mertesacker|CB|Arsenal|PL|GER|2011–16|82', 'Škrtel|CB|Liverpool|PL|SVK|2010–15|82',
    'Cahill|CB|Chelsea|PL|ENG|2012–17|83', 'Alderweireld|CB|Tottenham|PL|BEL|2015–19|84', 'Carragher|CB|Liverpool|PL|ENG|2004–09|84',
    'Baines|LB|Everton|PL|ENG|2010–15|83', 'Clichy|LB|Arsenal|PL|FRA|2006–11|82', 'Luke Shaw|LB|Manchester United|PL|ENG|2020–23|84',
    'Antonio Valencia|RM|Manchester United|PL|ECU|2009–14|83', 'Nani|RM|Manchester United|PL|POR|2010–12|84', 'Jesús Navas|RM|Sevilla|LL|ESP|2009–13|82',
    'Carrick|CM|Manchester United|PL|ENG|2007–13|85', 'Gareth Barry|CM|Manchester City|PL|ENG|2009–13|81', 'Henderson|CM|Liverpool|PL|ENG|2015–21|83', 'Arteta|CM|Everton|PL|ESP|2006–11|82',
    'Malouda|LM|Chelsea|PL|FRA|2009–12|83', 'Park Ji-sung|LM|Manchester United|PL|KOR|2007–11|81', 'Zaha|LM|Crystal Palace|PL|CIV|2017–21|81',
    'Defoe|ST|Tottenham|PL|ENG|2009–14|82', 'Džeko|ST|Manchester City|PL|BIH|2011–15|84', 'Vardy|ST|Leicester City|PL|ENG|2015–20|84', 'Giroud|ST|Arsenal|PL|FRA|2013–17|83',
    'Ranieri|MGR|Leicester City|PL|ITA|2015–16|84', 'Redknapp|MGR|Tottenham|PL|ENG|2008–12|81', 'Pochettino|MGR|Tottenham|PL|ARG|2015–19|85',
    // ---- Last-tier pool: players everyone knows but nobody wants (rating under 80) ----
    'Scott Carson|GK|West Bromwich Albion|PL|ENG|2008–11|74', 'Karius|GK|Liverpool|PL|GER|2016–18|76', 'Taibi|GK|Manchester United|PL|ITA|1999–2000|70',
    'Roy Carroll|GK|Manchester United|PL|NIR|2001–05|73', 'Rob Green|GK|West Ham United|PL|ENG|2006–12|75', 'Kepa|GK|Chelsea|PL|ESP|2018–20|78',
    'Wan-Bissaka|RB|Manchester United|PL|ENG|2019–22|78', 'Zappacosta|RB|Chelsea|PL|ITA|2017–19|75', 'Rafael|RB|Manchester United|PL|BRA|2010–14|77',
    'Calum Chambers|RB|Arsenal|PL|ENG|2014–17|73', 'Debuchy|RB|Arsenal|PL|FRA|2014–16|75',
    'Phil Jones|CB|Manchester United|PL|ENG|2012–17|76', 'Maguire|CB|Manchester United|PL|ENG|2019–21|79', 'Mustafi|CB|Arsenal|PL|GER|2016–19|76',
    'Titus Bramble|CB|Newcastle United|PL|ENG|2002–07|71', 'Bailly|CB|Manchester United|PL|CIV|2016–19|77', 'Lovren|CB|Liverpool|PL|CRO|2014–19|78',
    'Brandon Williams|LB|Manchester United|PL|ENG|2019–21|71', 'Marcos Alonso|LB|Chelsea|PL|ESP|2016–20|79', 'Danny Rose|LB|Tottenham|PL|ENG|2015–18|78',
    'Cissokho|LB|Liverpool|PL|FRA|2013–14|71', 'José Enrique|LB|Liverpool|PL|ESP|2011–13|75',
    'Lingard|RM|Manchester United|PL|ENG|2017–19|77', 'Walcott|RM|Arsenal|PL|ENG|2012–16|79', 'Wright-Phillips|RM|Chelsea|PL|ENG|2005–08|76',
    'Aaron Lennon|RM|Tottenham|PL|ENG|2006–12|77', 'Ashley Young|RM|Manchester United|PL|ENG|2011–15|78',
    'Kléberson|CM|Manchester United|PL|BRA|2003–05|72', 'Djemba-Djemba|CM|Manchester United|PL|CMR|2003–05|69', 'Drinkwater|CM|Chelsea|PL|ENG|2017–19|75',
    'Bakayoko|CM|Chelsea|PL|FRA|2017–18|75', 'Fred|CM|Manchester United|PL|BRA|2018–23|78', 'Cleverley|CM|Manchester United|PL|ENG|2011–14|74',
    'Downing|LM|Liverpool|PL|ENG|2011–13|75', 'Gervinho|LM|Arsenal|PL|CIV|2011–13|75', 'Memphis|LM|Manchester United|PL|NED|2015–17|76',
    'Albert Riera|LM|Liverpool|PL|ESP|2008–10|74', 'Townsend|LM|Tottenham|PL|ENG|2013–16|73',
    'Andy Carroll|ST|Liverpool|PL|ENG|2011–13|74', 'Heskey|ST|Liverpool|PL|ENG|2000–04|76', 'Bendtner|ST|Arsenal|PL|DEN|2008–11|73',
    'Van Wolfswinkel|ST|Norwich City|PL|NED|2013–14|69', 'Macheda|ST|Manchester United|PL|ITA|2009–11|70', 'Balotelli|ST|Manchester City|PL|ITA|2010–13|79',
    'Moyes|MGR|Manchester United|PL|SCO|2013–14|72', 'Frank de Boer|MGR|Crystal Palace|PL|NED|2017|68', 'Solskjær|MGR|Manchester United|PL|NOR|2019–21|77',
    'Tim Sherwood|MGR|Tottenham|PL|ENG|2014|69', 'McClaren|MGR|Newcastle United|PL|ENG|2015–16|70'
  ];
  // Wikipedia article titles, used to look up a free-licence photo from Wikimedia Commons.
  var WIKI = {
    'Buffon': 'Gianluigi Buffon', 'Casillas': 'Iker Casillas', 'Neuer': 'Manuel Neuer', 'Courtois': 'Thibaut Courtois', 'Alisson': 'Alisson Becker',
    'Van der Sar': 'Edwin van der Sar', 'Čech': 'Petr Čech', 'Kahn': 'Oliver Kahn', 'Schmeichel': 'Peter Schmeichel', 'Ederson': 'Ederson (footballer, born 1993)',
    'Oblak': 'Jan Oblak', 'Donnarumma': 'Gianluigi Donnarumma', 'Lloris': 'Hugo Lloris',
    'Cafu': 'Cafu', 'Lahm': 'Philipp Lahm', 'Dani Alves': 'Dani Alves', 'Carvajal': 'Dani Carvajal', 'Alexander-Arnold': 'Trent Alexander-Arnold',
    'Zanetti': 'Javier Zanetti', 'Hakimi': 'Achraf Hakimi', 'Gary Neville': 'Gary Neville', 'Kyle Walker': 'Kyle Walker', 'Thuram': 'Lilian Thuram',
    'Kimmich': 'Joshua Kimmich', 'Salgado': 'Míchel Salgado',
    'Maldini': 'Paolo Maldini', 'Beckenbauer': 'Franz Beckenbauer', 'Baresi': 'Franco Baresi', 'Cannavaro': 'Fabio Cannavaro', 'Nesta': 'Alessandro Nesta',
    'Puyol': 'Carles Puyol', 'Sergio Ramos': 'Sergio Ramos', 'Van Dijk': 'Virgil van Dijk', 'Terry': 'John Terry', 'Ferdinand': 'Rio Ferdinand',
    'Vidić': 'Nemanja Vidić', 'Piqué': 'Gerard Piqué', 'Thiago Silva': 'Thiago Silva', 'Chiellini': 'Giorgio Chiellini', 'Hummels': 'Mats Hummels',
    'Rúben Dias': 'Rúben Dias', 'Varane': 'Raphaël Varane', 'Godín': 'Diego Godín', 'Marquinhos': 'Marquinhos', 'Kompany': 'Vincent Kompany',
    'Roberto Carlos': 'Roberto Carlos', 'Marcelo': 'Marcelo (footballer, born 1988)', 'Ashley Cole': 'Ashley Cole', 'Evra': 'Patrice Evra',
    'Jordi Alba': 'Jordi Alba', 'Alaba': 'David Alaba', 'Robertson': 'Andrew Robertson', 'Theo Hernández': 'Theo Hernández',
    'Alphonso Davies': 'Alphonso Davies', 'Lizarazu': 'Bixente Lizarazu', 'Zambrotta': 'Gianluca Zambrotta', 'Brehme': 'Andreas Brehme',
    'Beckham': 'David Beckham', 'Figo': 'Luís Figo', 'Robben': 'Arjen Robben', 'Salah': 'Mohamed Salah', 'Bernardo Silva': 'Bernardo Silva',
    'Mahrez': 'Riyad Mahrez', 'Di María': 'Ángel Di María', 'Bale': 'Gareth Bale', 'Saka': 'Bukayo Saka', 'Dembélé': 'Ousmane Dembélé',
    'Lamine Yamal': 'Lamine Yamal', 'Sterling': 'Raheem Sterling',
    'Zidane': 'Zinedine Zidane', 'Xavi': 'Xavi', 'Iniesta': 'Andrés Iniesta', 'Pirlo': 'Andrea Pirlo', 'Gerrard': 'Steven Gerrard',
    'Lampard': 'Frank Lampard', 'Scholes': 'Paul Scholes', 'Roy Keane': 'Roy Keane', 'Vieira': 'Patrick Vieira', 'Modrić': 'Luka Modrić',
    'Kroos': 'Toni Kroos', 'De Bruyne': 'Kevin De Bruyne', 'Rodri': 'Rodri (footballer, born 1996)', 'Kaká': 'Kaká', 'Matthäus': 'Lothar Matthäus',
    'Platini': 'Michel Platini', 'Seedorf': 'Clarence Seedorf', 'Makélélé': 'Claude Makélélé', 'Bellingham': 'Jude Bellingham', 'Ballack': 'Michael Ballack',
    'Ribéry': 'Franck Ribéry', 'Ronaldinho': 'Ronaldinho', 'Neymar': 'Neymar', 'Hazard': 'Eden Hazard', 'Giggs': 'Ryan Giggs', 'Nedvěd': 'Pavel Nedvěd',
    'Pires': 'Robert Pires', 'Vinícius Júnior': 'Vinícius Júnior', 'Mané': 'Sadio Mané', 'Son Heung-min': 'Son Heung-min',
    'Kvaratskhelia': 'Khvicha Kvaratskhelia', 'Overmars': 'Marc Overmars',
    'Messi': 'Lionel Messi', 'Cristiano Ronaldo': 'Cristiano Ronaldo', 'Ronaldo Nazário': 'Ronaldo (Brazilian footballer)', 'Henry': 'Thierry Henry',
    'Shevchenko': 'Andriy Shevchenko', 'Lewandowski': 'Robert Lewandowski', 'Benzema': 'Karim Benzema', 'Haaland': 'Erling Haaland',
    'Mbappé': 'Kylian Mbappé', 'Van Basten': 'Marco van Basten', 'Batistuta': 'Gabriel Batistuta', 'Drogba': 'Didier Drogba', 'Rooney': 'Wayne Rooney',
    'Suárez': 'Luis Suárez', 'Ibrahimović': 'Zlatan Ibrahimović', "Eto'o": "Samuel Eto'o", 'Kane': 'Harry Kane', 'Agüero': 'Sergio Agüero',
    'Raúl': 'Raúl (footballer)', 'Gerd Müller': 'Gerd Müller',
    'Ferguson': 'Alex Ferguson', 'Guardiola': 'Pep Guardiola', 'Mourinho': 'José Mourinho', 'Ancelotti': 'Carlo Ancelotti', 'Klopp': 'Jürgen Klopp',
    'Sacchi': 'Arrigo Sacchi', 'Cruyff': 'Johan Cruyff', 'Wenger': 'Arsène Wenger', 'Zidane (manager)': 'Zinedine Zidane', 'Heynckes': 'Jupp Heynckes',
    'Simeone': 'Diego Simeone', 'Lippi': 'Marcello Lippi', 'Capello': 'Fabio Capello',
    'Busquets': 'Sergio Busquets', 'Casemiro': 'Casemiro', 'Yaya Touré': 'Yaya Touré', 'Fàbregas': 'Cesc Fàbregas', 'Schweinsteiger': 'Bastian Schweinsteiger',
    'Hierro': 'Fernando Hierro', 'Desailly': 'Marcel Desailly', 'Stam': 'Jaap Stam', 'Foden': 'Phil Foden', 'Coman': 'Kingsley Coman',
    'Rodrygo': 'Rodrygo', 'Cuadrado': 'Juan Cuadrado', 'Sané': 'Leroy Sané', 'Leão': 'Rafael Leão', 'Luis Díaz': 'Luis Díaz (footballer, born 1997)',
    'Joe Hart': 'Joe Hart', 'Pickford': 'Jordan Pickford', 'Reina': 'Pepe Reina', 'Glen Johnson': 'Glen Johnson', 'Zabaleta': 'Pablo Zabaleta',
    'Ivanović': 'Branislav Ivanović', 'Sagna': 'Bacary Sagna', 'Koscielny': 'Laurent Koscielny', 'Mertesacker': 'Per Mertesacker', 'Škrtel': 'Martin Škrtel',
    'Cahill': 'Gary Cahill', 'Alderweireld': 'Toby Alderweireld', 'Carragher': 'Jamie Carragher', 'Baines': 'Leighton Baines', 'Clichy': 'Gaël Clichy',
    'Luke Shaw': 'Luke Shaw', 'Antonio Valencia': 'Antonio Valencia', 'Nani': 'Nani (footballer)', 'Jesús Navas': 'Jesús Navas', 'Carrick': 'Michael Carrick',
    'Gareth Barry': 'Gareth Barry', 'Henderson': 'Jordan Henderson', 'Arteta': 'Mikel Arteta', 'Malouda': 'Florent Malouda', 'Park Ji-sung': 'Park Ji-sung',
    'Zaha': 'Wilfried Zaha', 'Defoe': 'Jermain Defoe', 'Džeko': 'Edin Džeko', 'Vardy': 'Jamie Vardy', 'Giroud': 'Olivier Giroud',
    'Ranieri': 'Claudio Ranieri', 'Redknapp': 'Harry Redknapp', 'Pochettino': 'Mauricio Pochettino',
    'Scott Carson': 'Scott Carson', 'Karius': 'Loris Karius', 'Taibi': 'Massimo Taibi', 'Roy Carroll': 'Roy Carroll', 'Rob Green': 'Robert Green', 'Kepa': 'Kepa Arrizabalaga',
    'Wan-Bissaka': 'Aaron Wan-Bissaka', 'Zappacosta': 'Davide Zappacosta', 'Rafael': 'Rafael (footballer, born 1990)', 'Calum Chambers': 'Calum Chambers', 'Debuchy': 'Mathieu Debuchy',
    'Phil Jones': 'Phil Jones (footballer, born 1992)', 'Maguire': 'Harry Maguire', 'Mustafi': 'Shkodran Mustafi', 'Titus Bramble': 'Titus Bramble', 'Bailly': 'Eric Bailly', 'Lovren': 'Dejan Lovren',
    'Brandon Williams': 'Brandon Williams (footballer, born 2000)', 'Marcos Alonso': 'Marcos Alonso (footballer, born 1990)', 'Danny Rose': 'Danny Rose (footballer, born 1990)',
    'Cissokho': 'Aly Cissokho', 'José Enrique': 'José Enrique (footballer)',
    'Lingard': 'Jesse Lingard', 'Walcott': 'Theo Walcott', 'Wright-Phillips': 'Shaun Wright-Phillips', 'Aaron Lennon': 'Aaron Lennon', 'Ashley Young': 'Ashley Young',
    'Kléberson': 'Kléberson', 'Djemba-Djemba': 'Eric Djemba-Djemba', 'Drinkwater': 'Danny Drinkwater', 'Bakayoko': 'Tiémoué Bakayoko', 'Fred': 'Fred (footballer, born 1993)', 'Cleverley': 'Tom Cleverley',
    'Downing': 'Stewart Downing', 'Gervinho': 'Gervinho', 'Memphis': 'Memphis Depay', 'Albert Riera': 'Albert Riera', 'Townsend': 'Andros Townsend',
    'Andy Carroll': 'Andy Carroll', 'Heskey': 'Emile Heskey', 'Bendtner': 'Nicklas Bendtner', 'Van Wolfswinkel': 'Ricky van Wolfswinkel', 'Macheda': 'Federico Macheda', 'Balotelli': 'Mario Balotelli',
    'Moyes': 'David Moyes', 'Frank de Boer': 'Frank de Boer', 'Solskjær': 'Ole Gunnar Solskjær', 'Tim Sherwood': 'Tim Sherwood', 'McClaren': 'Steve McClaren'
  };
  // Approximate peak market value in € millions (Transfermarkt-style). Transfermarkt's data starts in the
  // mid-2000s, so for players whose prime ended before 2005 the value is an estimate. Managers have none.
  var MV = {
    'Buffon': 40, 'Casillas': 40, 'Neuer': 45, 'Courtois': 75, 'Alisson': 70, 'Van der Sar': 12, 'Čech': 35, 'Kahn': 30, 'Schmeichel': 25,
    'Ederson': 55, 'Oblak': 90, 'Donnarumma': 65, 'Lloris': 40,
    'Cafu': 30, 'Lahm': 35, 'Dani Alves': 35, 'Carvajal': 40, 'Alexander-Arnold': 110, 'Zanetti': 25, 'Hakimi': 70, 'Gary Neville': 15,
    'Kyle Walker': 50, 'Thuram': 30, 'Kimmich': 90, 'Salgado': 15,
    'Maldini': 50, 'Beckenbauer': 50, 'Baresi': 45, 'Cannavaro': 35, 'Nesta': 40, 'Puyol': 30, 'Sergio Ramos': 50, 'Van Dijk': 100, 'Terry': 40,
    'Ferdinand': 35, 'Vidić': 40, 'Piqué': 50, 'Thiago Silva': 50, 'Chiellini': 45, 'Hummels': 50, 'Rúben Dias': 80, 'Varane': 80, 'Godín': 40,
    'Marquinhos': 75, 'Kompany': 40,
    'Roberto Carlos': 40, 'Marcelo': 60, 'Ashley Cole': 30, 'Evra': 25, 'Jordi Alba': 50, 'Alaba': 65, 'Robertson': 70, 'Theo Hernández': 60,
    'Alphonso Davies': 80, 'Lizarazu': 20, 'Zambrotta': 30, 'Brehme': 20,
    'Beckham': 40, 'Figo': 50, 'Robben': 45, 'Salah': 150, 'Bernardo Silva': 90, 'Mahrez': 50, 'Di María': 60, 'Bale': 90, 'Saka': 150,
    'Dembélé': 100, 'Lamine Yamal': 200, 'Sterling': 160,
    'Zidane': 75, 'Xavi': 80, 'Iniesta': 70, 'Pirlo': 45, 'Gerrard': 50, 'Lampard': 50, 'Scholes': 30, 'Roy Keane': 35, 'Vieira': 40, 'Modrić': 50,
    'Kroos': 80, 'De Bruyne': 150, 'Rodri': 130, 'Kaká': 70, 'Matthäus': 40, 'Platini': 50, 'Seedorf': 30, 'Makélélé': 25, 'Bellingham': 180, 'Ballack': 40,
    'Ribéry': 50, 'Ronaldinho': 80, 'Neymar': 180, 'Hazard': 150, 'Giggs': 30, 'Nedvěd': 40, 'Pires': 30, 'Vinícius Júnior': 200, 'Mané': 120,
    'Son Heung-min': 90, 'Kvaratskhelia': 90, 'Overmars': 25,
    'Messi': 180, 'Cristiano Ronaldo': 120, 'Ronaldo Nazário': 70, 'Henry': 50, 'Shevchenko': 50, 'Lewandowski': 80, 'Benzema': 65, 'Haaland': 200,
    'Mbappé': 200, 'Van Basten': 60, 'Batistuta': 40, 'Drogba': 35, 'Rooney': 70, 'Suárez': 90, 'Ibrahimović': 45, "Eto'o": 40, 'Kane': 150,
    'Agüero': 75, 'Raúl': 45, 'Gerd Müller': 50,
    'Busquets': 60, 'Casemiro': 70, 'Yaya Touré': 50, 'Fàbregas': 60, 'Schweinsteiger': 45, 'Hierro': 25, 'Desailly': 30, 'Stam': 30,
    'Foden': 150, 'Coman': 70, 'Rodrygo': 110, 'Cuadrado': 35, 'Sané': 90, 'Leão': 90, 'Luis Díaz': 85,
    'Joe Hart': 25, 'Pickford': 30, 'Reina': 20, 'Glen Johnson': 20, 'Zabaleta': 22, 'Ivanović': 22, 'Sagna': 18, 'Koscielny': 35, 'Mertesacker': 20,
    'Škrtel': 22, 'Cahill': 22, 'Alderweireld': 45, 'Carragher': 15, 'Baines': 25, 'Clichy': 15, 'Luke Shaw': 45, 'Antonio Valencia': 22, 'Nani': 30,
    'Jesús Navas': 25, 'Carrick': 25, 'Gareth Barry': 15, 'Henderson': 40, 'Arteta': 25, 'Malouda': 25, 'Park Ji-sung': 15, 'Zaha': 50,
    'Defoe': 20, 'Džeko': 40, 'Vardy': 25, 'Giroud': 30,
    'Scott Carson': 6, 'Karius': 12, 'Taibi': 5, 'Roy Carroll': 5, 'Rob Green': 8, 'Kepa': 35, 'Wan-Bissaka': 40, 'Zappacosta': 20, 'Rafael': 15,
    'Calum Chambers': 18, 'Debuchy': 12, 'Phil Jones': 25, 'Maguire': 50, 'Mustafi': 30, 'Titus Bramble': 5, 'Bailly': 35, 'Lovren': 25,
    'Brandon Williams': 15, 'Marcos Alonso': 35, 'Danny Rose': 30, 'Cissokho': 8, 'José Enrique': 10, 'Lingard': 35, 'Walcott': 30,
    'Wright-Phillips': 18, 'Aaron Lennon': 15, 'Ashley Young': 20, 'Kléberson': 8, 'Djemba-Djemba': 4, 'Drinkwater': 30, 'Bakayoko': 35,
    'Fred': 40, 'Cleverley': 15, 'Downing': 18, 'Gervinho': 15, 'Memphis': 40, 'Albert Riera': 10, 'Townsend': 18, 'Andy Carroll': 25,
    'Heskey': 10, 'Bendtner': 12, 'Van Wolfswinkel': 10, 'Macheda': 5, 'Balotelli': 40
  };
  function primeEnd(prime) {
    var parts = String(prime).split('–'), first = parts[0];
    if (parts.length < 2) return Number(first);
    var end = parts[1];
    return end.length === 4 ? Number(end) : Number(first.slice(0, 4 - end.length) + end);
  }
  var DB = RAW.map(function (line, i) {
    var f = line.split('|');
    return { id: i, name: f[0], pos: f[1], club: f[2], league: LEAGUES[f[3]], nation: f[4], prime: f[5], rating: Number(f[6]), wiki: WIKI[f[0]] || f[0],
      mv: f[1] === 'MGR' ? null : (MV[f[0]] || null), mvEst: primeEnd(f[5]) < 2005 };
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = DB; else root.PLAYER_DB = DB;
})(this);
