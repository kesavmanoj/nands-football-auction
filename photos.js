// Player photos from Wikipedia / Wikimedia Commons.
// Only images hosted on Wikimedia Commons (free licences) are used; anything else falls back to a silhouette.
window.Photos = (function () {
  var cache = {};
  var byUrl = {};
  function api(base, params) {
    var q = new URLSearchParams(Object.assign({ format: 'json', origin: '*' }, params));
    return fetch(base + '?' + q.toString()).then(function (r) { return r.json(); });
  }
  function pick(data) {
    var pages = data && data.query && data.query.pages;
    if (!pages) return null;
    for (var k in pages) {
      var p = pages[k];
      if (p.thumbnail && /\/wikipedia\/commons\//.test(p.thumbnail.source)) return { url: p.thumbnail.source, file: p.pageimage };
    }
    return null;
  }
  function get(title) {
    if (!title) return Promise.resolve(null);
    if (!cache[title]) {
      var common = { action: 'query', prop: 'pageimages', piprop: 'thumbnail|name', pithumbsize: 400 };
      cache[title] = api('https://en.wikipedia.org/w/api.php', Object.assign({ redirects: 1, titles: title }, common))
        .then(pick)
        .then(function (r) {
          if (r) return r;
          return api('https://en.wikipedia.org/w/api.php', Object.assign({ generator: 'search', gsrsearch: title + ' football', gsrlimit: 1 }, common)).then(pick);
        })
        .then(function (r) { if (r) byUrl[r.url] = r.file; return r; })
        .catch(function () { return null; });
    }
    return cache[title];
  }
  // Fills every <img data-photo="Wikipedia title"> inside root.
  function hydrate(root) {
    var imgs = root.querySelectorAll('img[data-photo]');
    Array.prototype.forEach.call(imgs, function (img) {
      get(img.getAttribute('data-photo')).then(function (r) {
        if (r) { img.src = r.url; img.style.visibility = 'visible'; }
      });
    });
  }
  function strip(html) { var d = document.createElement('div'); d.innerHTML = html || ''; return (d.textContent || '').trim(); }
  // Author + licence for the photos used, from Wikimedia Commons.
  function credits(titles) {
    return Promise.all(titles.map(get)).then(function (rs) {
      var files = [];
      rs.forEach(function (r) { if (r && files.indexOf(r.file) < 0) files.push(r.file); });
      if (!files.length) return [];
      var batches = [];
      for (var i = 0; i < files.length; i += 40) batches.push(files.slice(i, i + 40));
      return Promise.all(batches.map(function (b) {
        return api('https://commons.wikimedia.org/w/api.php', { action: 'query', prop: 'imageinfo', iiprop: 'extmetadata', titles: b.map(function (f) { return 'File:' + f; }).join('|') });
      })).then(function (datas) {
        var out = [];
        datas.forEach(function (d) {
          var pages = (d.query && d.query.pages) || {};
          for (var k in pages) {
            var p = pages[k], m = (p.imageinfo && p.imageinfo[0] && p.imageinfo[0].extmetadata) || {};
            out.push({ file: p.title, artist: strip(m.Artist && m.Artist.value) || 'Unknown', license: strip(m.LicenseShortName && m.LicenseShortName.value) || 'See file page',
              url: 'https://commons.wikimedia.org/wiki/' + encodeURIComponent(p.title.replace(/ /g, '_')) });
          }
        });
        return out;
      });
    }).catch(function () { return []; });
  }
  return { get: get, hydrate: hydrate, credits: credits };
})();
