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
    'Capello|MGR|AC Milan|SA|ITA|1992–96|88'
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
    'Simeone': 'Diego Simeone', 'Lippi': 'Marcello Lippi', 'Capello': 'Fabio Capello'
  };
  var DB = RAW.map(function (line, i) {
    var f = line.split('|');
    return { id: i, name: f[0], pos: f[1], club: f[2], league: LEAGUES[f[3]], nation: f[4], prime: f[5], rating: Number(f[6]), wiki: WIKI[f[0]] || f[0] };
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = DB; else root.PLAYER_DB = DB;
})(this);
