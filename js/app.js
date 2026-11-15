/* =========================================================
   Bakerz Bite — single-page application (jQuery + Bootstrap 5)
   Data store: data/*.json and sitemap.xml
   ========================================================= */
(function ($) {
  'use strict';

  // ---------------------------------------------------------------- state
  var DATA = null;             // everything loaded from the JSON/XML files
  var CATALOG = {};            // id -> product or merchandise item
  var PAGES = ['home', 'menu', 'offers', 'merchandise', 'gallery', 'about', 'contact', 'feedback', 'faq', 'sitemap'];
  var MORE_PAGES = ['feedback', 'faq', 'sitemap'];
  var DIETARY = ['Eggless', 'Vegetarian', 'Nut-free', 'Gluten-free'];
  var TAGS = ['Bestseller', 'New', "Chef's pick"];
  var filters = { q: '', cats: [], maxPrice: 0, diet: [], tags: [], sort: 'featured' };
  var cart = {};               // id -> quantity
  var promoCode = '';
  var reviews = [];
  var galleryState = { cat: 'All', list: [], index: 0 };
  var merchType = 'All';
  var modalItem = { id: null, qty: 1 };
  var currentPage = null;

  // ---------------------------------------------------------------- helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) { return 'Rs. ' + Math.round(n).toLocaleString('en-US'); }
  function store(key, value) {
    try {
      if (value === undefined) { var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { return null; }
    return null;
  }
  function starsHtml(n) {
    var s = '';
    for (var i = 1; i <= 5; i++) s += i <= Math.round(n) ? '★' : '<span class="off">★</span>';
    return '<span class="stars" aria-label="' + n + ' out of 5 stars">' + s + '</span>';
  }
  function niceDate(iso) {
    var d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function todayIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function toast(msg) {
    $('#toastText').text(msg);
    bootstrap.Toast.getOrCreateInstance(document.getElementById('toast'), { delay: 2600 }).show();
  }
  var ICON = {
    plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>',
    calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    tag: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
    mail: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
    phone: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    chat: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2-5.4A8.4 8.4 0 1 1 21 11.5z"/></svg>'
  };

  // ---------------------------------------------------------------- data loading
  // On a web server the app reads the JSON and XML files with jQuery AJAX.
  // When index.html is opened straight from disk (file://) browsers block that,
  // so the copy in js/data.js is used instead.
  function loadData() {
    var dfd = $.Deferred();
    var fallback = window.BAKERZ_DATA;
    if (location.protocol === 'file:' && fallback) { return dfd.resolve(fallback).promise(); }
    var names = ['site', 'products', 'merchandise', 'offers', 'reviews', 'faq', 'gallery'];
    var calls = names.map(function (n) { return $.getJSON('data/' + n + '.json'); });
    calls.push($.ajax({ url: 'sitemap.xml', dataType: 'text' }));
    $.when.apply($, calls).done(function () {
      var out = {}, args = arguments;
      names.forEach(function (n, i) { out[n] = args[i][0]; });
      out.sitemapXml = args[names.length][0];
      dfd.resolve(out);
    }).fail(function () {
      if (fallback) dfd.resolve(fallback); else dfd.reject();
    });
    return dfd.promise();
  }

  function buildCatalog() {
    DATA.products.forEach(function (p) { CATALOG[p.id] = p; });
    DATA.merchandise.forEach(function (m) {
      CATALOG[m.id] = $.extend({}, m, { category: 'Merchandise', unit: m.type, dietary: [], ingredients: null });
    });
  }

  // ---------------------------------------------------------------- product card
  function cardHtml(item, colClass) {
    var tag = item.tags && item.tags.length ? '<span class="p-tag">' + esc(item.tags[0]) + '</span>' : '';
    var inCart = cart[item.id] ? ' added' : '';
    return '<div class="' + (colClass || 'col-sm-6 col-lg-4') + '">' +
      '<article class="p-card">' +
        '<div class="p-img"><img src="' + esc(item.images[0]) + '" alt="' + esc(item.name) + '" loading="lazy">' + tag +
          '<span class="p-view" aria-hidden="true">View details</span></div>' +
        '<div class="p-body">' +
          '<span class="p-cat">' + esc(item.category === 'Merchandise' ? item.type : item.category) + '</span>' +
          '<h3 class="p-name"><button type="button" class="p-open" data-open="' + esc(item.id) + '">' + esc(item.name) + '</button></h3>' +
          '<p class="p-unit">' + esc(item.unit) + '</p>' +
          '<div class="p-foot"><span class="p-price">' + money(item.price) + '</span>' +
            '<button type="button" class="add-btn' + inCart + '" data-add="' + esc(item.id) + '" aria-label="Add ' + esc(item.name) + ' to cart">' + (inCart ? ICON.check : ICON.plus) + '</button>' +
          '</div>' +
        '</div>' +
      '</article></div>';
  }

  // ---------------------------------------------------------------- HOME
  function renderHome() {
    var cats = DATA.site.categories.map(function (c) {
      var first = DATA.products.filter(function (p) { return p.category === c; })[0];
      return '<div class="col-6 col-sm-4 col-md-3 col-xl-2">' +
        '<a class="cat-tile" href="#menu/' + encodeURIComponent(c) + '"><img src="' + esc(first.images[0]) + '" alt="" loading="lazy"><span>' + esc(c) + '</span></a></div>';
    });
    $('#homeCategories').html(cats.join(''));

    var best = DATA.products.filter(function (p) { return p.tags.indexOf('Bestseller') > -1; }).slice(0, 8);
    $('#homeBestsellers').html(best.map(function (p) { return cardHtml(p, 'col-sm-6 col-lg-3'); }).join(''));

    $('#homeOffers').html(DATA.offers.slice(0, 3).map(function (o) {
      return '<div class="col-md-4"><a class="offer-mini" href="#offers"><img src="' + esc(o.image) + '" alt="" loading="lazy">' +
        '<div><span class="badge-text">' + esc(o.badge) + '</span><h3 class="h5 mb-1">' + esc(o.title) + '</h3><p class="mb-0 small">' + esc(o.description) + '</p></div></a></div>';
    }).join(''));

    $('#homeMerch').html(DATA.merchandise.slice(0, 4).map(function (m) { return cardHtml(CATALOG[m.id], 'col-sm-6 col-lg-3'); }).join(''));

    var msg = 'Hi Bakerz Bite! I would like to order a custom cake.';
    $('#customCakeBtn').attr('href', 'https://wa.me/' + DATA.site.whatsapp + '?text=' + encodeURIComponent(msg));
    renderHomeReviews();
  }

  function renderHomeReviews() {
    var latest = reviews.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 3);
    $('#homeReviews').html(latest.map(function (r) {
      return '<div class="col-md-4"><figure class="review-card">' + starsHtml(r.rating) +
        '<blockquote>' + esc(r.comment) + '</blockquote><figcaption>— ' + esc(r.name) + (r.item ? ' · ' + esc(r.item) : '') + '</figcaption></figure></div>';
    }).join(''));
  }

  // ---------------------------------------------------------------- MENU + FILTERS
  function maxProductPrice() {
    return Math.ceil(Math.max.apply(null, DATA.products.map(function (p) { return p.price; })) / 50) * 50;
  }

  function renderFilterControls() {
    var counts = {};
    DATA.products.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    $('#fCategories').html(DATA.site.categories.map(function (c, i) {
      return '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + esc(c) + '" id="fc' + i + '" data-filter="cats">' +
        '<label class="form-check-label" for="fc' + i + '">' + esc(c) + ' <span class="count">' + counts[c] + '</span></label></div>';
    }).join(''));
    $('#fDietary').html(DIETARY.map(function (d, i) {
      return '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + esc(d) + '" id="fd' + i + '" data-filter="diet">' +
        '<label class="form-check-label" for="fd' + i + '">' + esc(d) + '</label></div>';
    }).join(''));
    $('#fTags').html(TAGS.map(function (t, i) {
      return '<div class="form-check"><input class="form-check-input" type="checkbox" value="' + esc(t) + '" id="ft' + i + '" data-filter="tags">' +
        '<label class="form-check-label" for="ft' + i + '">' + esc(t) + '</label></div>';
    }).join(''));
    var max = maxProductPrice();
    filters.maxPrice = max;
    $('#fPrice').attr('max', max).val(max);
  }

  function syncFilterControls() {
    $('#fSearch').val(filters.q);
    $('#fPrice').val(filters.maxPrice);
    $('#fSort').val(filters.sort);
    $('[data-filter]').each(function () {
      $(this).prop('checked', filters[$(this).data('filter')].indexOf(this.value) > -1);
    });
  }

  function filteredProducts() {
    var q = filters.q.trim().toLowerCase();
    var list = DATA.products.filter(function (p) {
      if (filters.cats.length && filters.cats.indexOf(p.category) < 0) return false;
      if (p.price > filters.maxPrice) return false;
      for (var i = 0; i < filters.diet.length; i++) if (p.dietary.indexOf(filters.diet[i]) < 0) return false;
      if (filters.tags.length && !filters.tags.some(function (t) { return p.tags.indexOf(t) > -1; })) return false;
      if (q) {
        var hay = (p.name + ' ' + p.category + ' ' + p.description + ' ' + p.ingredients.join(' ')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    if (filters.sort === 'price-asc') list.sort(function (a, b) { return a.price - b.price; });
    if (filters.sort === 'price-desc') list.sort(function (a, b) { return b.price - a.price; });
    if (filters.sort === 'name') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return list;
  }

  function renderMenu() {
    var list = filteredProducts();
    $('#fPriceLabel').text(money(filters.maxPrice));
    $('#resultCount').text('Showing ' + list.length + ' of ' + DATA.products.length + ' items');
    $('#menuGrid').html(list.map(function (p) { return cardHtml(p); }).join(''));
    $('#menuEmpty').toggleClass('d-none', list.length > 0);

    var chips = [];
    if (filters.q) chips.push(['q', filters.q, 'Search: ' + filters.q]);
    filters.cats.forEach(function (c) { chips.push(['cats', c, c]); });
    filters.diet.forEach(function (d) { chips.push(['diet', d, d]); });
    filters.tags.forEach(function (t) { chips.push(['tags', t, t]); });
    if (filters.maxPrice < maxProductPrice()) chips.push(['maxPrice', '', 'Up to ' + money(filters.maxPrice)]);
    $('#activeFilters').html(chips.map(function (c) {
      return '<button type="button" class="chip" data-chip="' + c[0] + '" data-value="' + esc(c[1]) + '" aria-label="Remove filter ' + esc(c[2]) + '">' + esc(c[2]) + ' ×</button>';
    }).join(''));
  }

  function resetFilters() {
    filters = { q: '', cats: [], maxPrice: maxProductPrice(), diet: [], tags: [], sort: 'featured' };
    syncFilterControls();
    renderMenu();
  }

  function bindMenu() {
    $('#fSearch').on('input', function () { filters.q = this.value; renderMenu(); });
    $('#fPrice').on('input', function () { filters.maxPrice = +this.value; renderMenu(); });
    $('#fSort').on('change', function () { filters.sort = this.value; renderMenu(); });
    $('#filterPanel').on('change', '[data-filter]', function () {
      var key = $(this).data('filter');
      filters[key] = $('[data-filter="' + key + '"]:checked').map(function () { return this.value; }).get();
      renderMenu();
    }).on('submit', function (e) { e.preventDefault(); });
    $('#fReset, #menuEmptyReset').on('click', function (e) { e.preventDefault(); resetFilters(); });
    $('#activeFilters').on('click', '.chip', function () {
      var key = $(this).data('chip'), val = String($(this).data('value'));
      if (key === 'q') filters.q = '';
      else if (key === 'maxPrice') filters.maxPrice = maxProductPrice();
      else filters[key] = filters[key].filter(function (v) { return v !== val; });
      syncFilterControls(); renderMenu();
    });
    $('#filterToggle').on('click', function () {
      var $p = $('#filterPanel'), open = $p.is(':visible');
      $p.stop(true, true).slideToggle(250);
      $(this).attr('aria-expanded', !open).text(open ? 'Show filters' : 'Hide filters');
    });
  }

  // ---------------------------------------------------------------- PRODUCT POP-UP
  function openProduct(id) {
    var item = CATALOG[id];
    if (!item) return;
    modalItem = { id: id, qty: 1 };
    $('#pmTitle').text(item.name);
    var badges = '<span class="badge-rose">' + esc(item.category === 'Merchandise' ? 'Merchandise · ' + item.type : item.category) + '</span>';
    (item.tags || []).forEach(function (t) { badges += '<span class="badge-rose">' + esc(t) + '</span>'; });
    (item.dietary || []).forEach(function (d) { badges += '<span class="badge-soft">' + esc(d) + '</span>'; });
    $('#pmBadges').html(badges);
    $('#pmPrice').html(money(item.price) + ' <small>/ ' + esc(item.unit) + '</small>');
    $('#pmDesc').text(item.description);

    if (item.ingredients) {
      $('#pmListTitle, #pmIngredients').show();
      $('#pmIngredients').html(item.ingredients.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join(''));
    } else {
      $('#pmListTitle, #pmIngredients').hide();
    }
    $('#pmSpecs').html($.map(item.specs, function (v, k) { return '<tr><th scope="row">' + esc(k) + '</th><td>' + esc(v) + '</td></tr>'; }).join(''));

    var labels = ['photo', 'close-up', 'another view'];
    var carEl = document.getElementById('pmCarousel');
    var old = bootstrap.Carousel.getInstance(carEl); if (old) old.dispose();
    $('#pmSlides').html(item.images.map(function (src, i) {
      return '<div class="carousel-item' + (i === 0 ? ' active' : '') + '"><img src="' + esc(src) + '" alt="' + esc(item.name + ' — ' + labels[i]) + '"></div>';
    }).join(''));
    $('#pmThumbs').html(item.images.length > 1 ? item.images.map(function (src, i) {
      return '<button type="button" class="pm-thumb' + (i === 0 ? ' active' : '') + '" data-slide="' + i + '" aria-label="Show image ' + (i + 1) + '"><img src="' + esc(src) + '" alt=""></button>';
    }).join('') : '');
    $('#pmCarousel .carousel-control-prev, #pmCarousel .carousel-control-next').toggle(item.images.length > 1);
    bootstrap.Carousel.getOrCreateInstance(carEl, { interval: false, ride: false, touch: true });

    $('#pmQty').text(1);
    $('#pmAdd').text('Add to cart · ' + money(item.price));
    bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal')).show();
  }

  function bindProductModal() {
    $(document).on('click', '[data-open]', function (e) { e.preventDefault(); openProduct($(this).data('open')); });
    $('#pmThumbs').on('click', '.pm-thumb', function () {
      bootstrap.Carousel.getOrCreateInstance(document.getElementById('pmCarousel')).to(+$(this).data('slide'));
    });
    $('#pmCarousel').on('slid.bs.carousel', function (e) {
      $('#pmThumbs .pm-thumb').removeClass('active').eq(e.to).addClass('active');
    });
    function setQty(q) {
      modalItem.qty = Math.max(1, Math.min(50, q));
      $('#pmQty').text(modalItem.qty);
      $('#pmAdd').text('Add to cart · ' + money(CATALOG[modalItem.id].price * modalItem.qty));
    }
    $('#pmMinus').on('click', function () { setQty(modalItem.qty - 1); });
    $('#pmPlus').on('click', function () { setQty(modalItem.qty + 1); });
    $('#pmAdd').on('click', function () {
      addToCart(modalItem.id, modalItem.qty);
      bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
    });
  }

  // ---------------------------------------------------------------- CART
  function addToCart(id, qty) {
    cart[id] = (cart[id] || 0) + (qty || 1);
    saveCart();
    toast(CATALOG[id].name + (qty > 1 ? ' × ' + qty : '') + ' added to your cart');
    $('[data-add="' + id + '"]').addClass('added').html(ICON.check);
  }
  function saveCart() {
    store('bb-cart', cart); store('bb-promo', promoCode);
    renderCart();
  }

  function cartLines() {
    return Object.keys(cart).filter(function (id) { return CATALOG[id] && cart[id] > 0; }).map(function (id) {
      return { item: CATALOG[id], qty: cart[id], sub: CATALOG[id].price * cart[id] };
    });
  }

  // Works out the discount for the applied promo code.
  function evaluatePromo(lines, subtotal) {
    if (!promoCode) return { amount: 0, msg: '', ok: true };
    var offer = DATA.offers.filter(function (o) { return o.code && o.code.toUpperCase() === promoCode; })[0];
    if (!offer) return { amount: 0, msg: 'Sorry, "' + promoCode + '" is not a valid code.', ok: false };
    var d = offer.discount;
    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    if (d.days && d.days.indexOf(new Date().getDay()) < 0) {
      return { amount: 0, ok: false, msg: promoCode + ' is valid only on ' + d.days.map(function (x) { return dayNames[x]; }).join(' and ') + '.' };
    }
    if (d.minOrder && subtotal < d.minOrder) {
      return { amount: 0, ok: false, msg: promoCode + ' needs an order of ' + money(d.minOrder) + ' or more.' };
    }
    var base = subtotal;
    if (d.category) {
      base = lines.filter(function (l) { return l.item.category === d.category; }).reduce(function (a, l) { return a + l.sub; }, 0);
      if (!base) return { amount: 0, ok: false, msg: promoCode + ' applies to ' + d.category + ' — add some to your cart.' };
    }
    var amount = Math.round(base * d.value / 100);
    return { amount: amount, ok: true, msg: promoCode + ' applied: ' + d.value + '% off' + (d.category ? ' ' + d.category : '') + '.' };
  }

  function cartTotals() {
    var lines = cartLines();
    var subtotal = lines.reduce(function (a, l) { return a + l.sub; }, 0);
    var promo = evaluatePromo(lines, subtotal);
    var after = subtotal - promo.amount;
    var delivery = !lines.length || after >= DATA.site.freeDeliveryOver ? 0 : DATA.site.deliveryFee;
    return { lines: lines, count: lines.reduce(function (a, l) { return a + l.qty; }, 0), subtotal: subtotal, promo: promo, delivery: delivery, total: after + delivery };
  }

  var checkout = { name: '', phone: '', address: '', date: '', notes: '' };

  function renderCart() {
    var t = cartTotals();
    $('#cartCount').text(t.count);
    var $body = $('#cartBody');
    if (!t.lines.length) {
      $body.html('<div class="empty-state"><h3 class="h5">Your box is empty</h3><p>Add something sweet from our menu!</p>' +
        '<button type="button" class="btn btn-rose" id="cartBrowse">Browse the menu</button></div>');
      return;
    }
    var html = '<div class="cart-top"><span class="fw-bold">' + t.count + (t.count === 1 ? ' item' : ' items') + '</span>' +
      '<button type="button" class="btn-link-danger" id="clearCart">Clear all items</button></div>';
    html += t.lines.map(function (l) {
      return '<div class="cart-line"><img src="' + esc(l.item.images[0]) + '" alt="">' +
        '<div class="info"><p class="name">' + esc(l.item.name) + '</p><p class="meta">' + esc(l.item.unit) + ' · ' + money(l.item.price) + '</p>' +
        '<div class="d-flex align-items-center gap-2"><div class="qty"><button type="button" class="qty-btn" data-dec="' + l.item.id + '" aria-label="Remove one ' + esc(l.item.name) + '">−</button>' +
        '<span>' + l.qty + '</span><button type="button" class="qty-btn" data-inc="' + l.item.id + '" aria-label="Add one ' + esc(l.item.name) + '">+</button></div>' +
        '<button type="button" class="remove-btn" data-remove="' + l.item.id + '">Remove</button></div></div>' +
        '<span class="sub">' + money(l.sub) + '</span></div>';
    }).join('');
    html += '<form class="promo" id="promoForm"><label for="promoInput" class="visually-hidden">Promo code</label>' +
      '<input class="form-control" id="promoInput" placeholder="Promo code" value="' + esc(promoCode) + '" autocomplete="off">' +
      (promoCode ? '<button type="button" class="btn btn-outline-rose" id="promoRemove">Remove</button>' : '<button type="submit" class="btn btn-outline-rose">Apply</button>') + '</form>' +
      '<p class="promo-msg ' + (t.promo.msg ? (t.promo.ok ? 'ok' : 'err') : '') + '" role="status">' + esc(t.promo.msg) + '</p>';
    html += '<div class="totals"><div><span>Subtotal</span><span>' + money(t.subtotal) + '</span></div>' +
      (t.promo.amount ? '<div class="disc"><span>Discount (' + esc(promoCode) + ')</span><span>− ' + money(t.promo.amount) + '</span></div>' : '') +
      '<div><span>Delivery</span><span>' + (t.delivery ? money(t.delivery) : 'Free') + '</span></div>' +
      '<div class="grand"><span>Total</span><span>' + money(t.total) + '</span></div></div>' +
      '<p class="small text-muted">Free delivery on orders of ' + money(DATA.site.freeDeliveryOver) + ' or more.</p>';
    html += '<form id="checkoutForm" novalidate><h3 class="h5">Delivery details</h3>' +
      field('coName', 'Your name', 'text', 'name', 'required minlength="2"', 'Please enter your name.') +
      field('coPhone', 'Phone number', 'tel', 'phone', 'required pattern="0[0-9]{3}-?[0-9]{7}" placeholder="03XX-XXXXXXX"', 'Please enter a phone number like 0321-7654321.') +
      field('coAddress', 'Delivery address', 'text', 'address', 'required minlength="8" placeholder="House #, street, area"', 'Please enter your delivery address.') +
      field('coDate', 'Delivery date', 'date', 'date', 'required min="' + todayIso() + '"', 'Please choose today or a later date.') +
      '<div class="mb-3"><label class="form-label" for="coNotes">Notes / message on cake (optional)</label><input class="form-control" id="coNotes" data-co="notes" value="' + esc(checkout.notes) + '"></div>' +
      '<button type="submit" class="btn btn-rose w-100 btn-lg">Place order &amp; get slip</button>' +
      '<p class="small text-center mt-2 mb-0">Cash on delivery.</p></form>';
    $body.html(html);

    function field(id, label, type, key, attrs, err) {
      return '<div class="mb-3"><label class="form-label" for="' + id + '">' + label + '</label>' +
        '<input class="form-control" type="' + type + '" id="' + id + '" data-co="' + key + '" value="' + esc(checkout[key]) + '" ' + attrs + '>' +
        '<div class="invalid-feedback">' + err + '</div></div>';
    }
  }

  function bindCart() {
    $(document).on('click', '[data-add]', function (e) {
      e.preventDefault(); e.stopPropagation();
      addToCart($(this).data('add'), 1);
    });
    var $body = $('#cartBody');
    $body.on('click', '#cartBrowse', function () {
      bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('cartPanel')).hide();
      location.hash = '#menu';
    });
    $body.on('click', '[data-inc]', function () { cart[$(this).data('inc')]++; saveCart(); });
    $body.on('click', '[data-dec]', function () {
      var id = $(this).data('dec'); cart[id]--; if (cart[id] <= 0) { delete cart[id]; refreshAddButtons(id); } saveCart();
    });
    $body.on('click', '[data-remove]', function () { var id = $(this).data('remove'); delete cart[id]; refreshAddButtons(id); saveCart(); });
    $body.on('click', '#clearCart', function () {
      if (window.confirm('Remove all items from your cart?')) {
        var ids = Object.keys(cart); cart = {}; promoCode = ''; ids.forEach(refreshAddButtons); saveCart(); toast('Your cart is now empty');
      }
    });
    $body.on('submit', '#promoForm', function (e) {
      e.preventDefault();
      promoCode = $.trim($('#promoInput').val()).toUpperCase();
      saveCart();
    });
    $body.on('click', '#promoRemove', function () { promoCode = ''; saveCart(); });
    $body.on('input change', '[data-co]', function () {
      checkout[$(this).data('co')] = this.value;
      if (this.checkValidity()) $(this).removeClass('is-invalid');
    });
    $body.on('submit', '#checkoutForm', function (e) {
      e.preventDefault();
      var ok = true;
      $(this).find('[required]').each(function () {
        var valid = this.checkValidity() && $.trim(this.value) !== '';
        $(this).toggleClass('is-invalid', !valid); if (!valid && ok) { ok = false; this.focus(); }
      });
      if (!ok) return;

      var t = cartTotals();
      var order = {
        items: t.lines.map(function (l) { return { name: l.item.name, qty: l.qty, price: l.item.price }; }),
        discount: t.promo.amount,
        delivery: t.delivery,
        customer: { name: checkout.name, phone: checkout.phone, address: checkout.address },
        date: niceDate(checkout.date),
        notes: checkout.notes,
        onDone: function () {
          var ids = Object.keys(cart);
          cart = {}; promoCode = '';
          checkout.notes = '';
          ids.forEach(refreshAddButtons);
          saveCart();
        }
      };

      // pehle cart panel band karo, phir slip kholo
      var panel = document.getElementById('cartPanel');
      panel.addEventListener('hidden.bs.offcanvas', function () { BB_Bill.open(order); }, { once: true });
      bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
    });
  }
  function refreshAddButtons(id) { $('[data-add="' + id + '"]').removeClass('added').html(ICON.plus); }

  // ---------------------------------------------------------------- OFFERS
  function renderOffers() {
    $('#offersGrid').html(DATA.offers.map(function (o) {
      var target = o.category === 'Merchandise' ? '#merchandise' : o.category ? '#menu/' + encodeURIComponent(o.category) : '#menu';
      return '<div class="col-md-6 col-xl-4"><article class="offer-card">' +
        '<div class="offer-img"><img src="' + esc(o.image) + '" alt="" loading="lazy"><span class="offer-badge">' + esc(o.badge) + '</span></div>' +
        '<div class="offer-body"><h3>' + esc(o.title) + '</h3><p class="mb-1">' + esc(o.description) + '</p>' +
        '<ul>' + o.details.map(function (d) { return '<li>' + esc(d) + '</li>'; }).join('') + '</ul>' +
        '<p class="offer-valid mb-2">Valid till: ' + esc(o.validTill) + '</p>' +
        '<div class="code-row">' + (o.code ? '<span class="code">' + esc(o.code) + '</span><button type="button" class="btn btn-outline-rose btn-sm" data-copy="' + esc(o.code) + '">Copy code</button>' : '<span class="badge-soft">Applied automatically</span>') +
        '<a href="' + target + '" class="btn btn-rose btn-sm ms-auto">Shop now</a></div></div></article></div>';
    }).join(''));
    $('#offersGrid').on('click', '[data-copy]', function () {
      var code = $(this).data('copy'), $btn = $(this);
      function done() { $btn.text('Copied!'); toast('Code ' + code + ' copied — paste it in your cart'); setTimeout(function () { $btn.text('Copy code'); }, 1800); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, fallback); else fallback();
      function fallback() {
        var $t = $('<textarea>').val(code).css({ position: 'fixed', opacity: 0 }).appendTo('body'); $t[0].select();
        try { document.execCommand('copy'); } catch (e) { /* ignore */ }
        $t.remove(); done();
      }
    });
  }

  // ---------------------------------------------------------------- MERCHANDISE
  function renderMerch() {
    var types = ['All'];
    DATA.merchandise.forEach(function (m) { if (types.indexOf(m.type) < 0) types.push(m.type); });
    $('#merchFilter').html(types.map(function (t) {
      return '<button type="button" class="pill' + (t === merchType ? ' active' : '') + '" data-type="' + esc(t) + '" aria-pressed="' + (t === merchType) + '">' + esc(t) + '</button>';
    }).join(''));
    var list = DATA.merchandise.filter(function (m) { return merchType === 'All' || m.type === merchType; });
    $('#merchGrid').html(list.map(function (m) { return cardHtml(CATALOG[m.id], 'col-sm-6 col-lg-4 col-xl-3'); }).join(''));
  }
  function bindMerch() {
    $('#merchFilter').on('click', '.pill', function () { merchType = $(this).data('type'); renderMerch(); });
  }

  // ---------------------------------------------------------------- GALLERY
  function renderGallery() {
    var cats = ['All'];
    DATA.gallery.forEach(function (g) { if (cats.indexOf(g.category) < 0) cats.push(g.category); });
    $('#galleryFilter').html(cats.map(function (c) {
      return '<button type="button" class="pill' + (c === galleryState.cat ? ' active' : '') + '" data-gcat="' + esc(c) + '" aria-pressed="' + (c === galleryState.cat) + '">' + esc(c) + '</button>';
    }).join(''));
    galleryState.list = DATA.gallery.filter(function (g) { return galleryState.cat === 'All' || g.category === galleryState.cat; });
    var $grid = $('#galleryGrid');
    $grid.fadeOut(120, function () {
      $grid.html(galleryState.list.map(function (g, i) {
        return '<figure class="m-0"><button type="button" class="g-item" data-gi="' + i + '" aria-label="Open photo: ' + esc(g.title) + '">' +
          '<img src="' + esc(g.src) + '" alt="' + esc(g.title) + '" loading="lazy"><figcaption>' + esc(g.title) + '</figcaption></button></figure>';
      }).join('')).fadeIn(250);
    });
  }
  function showLightbox(i) {
    var list = galleryState.list;
    galleryState.index = (i + list.length) % list.length;
    var g = list[galleryState.index];
    $('#lbImage').attr({ src: g.src, alt: g.title });
    $('#lbTitle').text(g.title);
    $('#lbCounter').text((galleryState.index + 1) + ' of ' + list.length + ' · ' + g.category);
  }
  function bindGallery() {
    $('#galleryFilter').on('click', '.pill', function () { galleryState.cat = $(this).data('gcat'); renderGallery(); });
    $('#galleryGrid').on('click', '.g-item', function () {
      showLightbox(+$(this).data('gi'));
      bootstrap.Modal.getOrCreateInstance(document.getElementById('lightbox')).show();
    });
    $('#lbPrev').on('click', function () { showLightbox(galleryState.index - 1); });
    $('#lbNext').on('click', function () { showLightbox(galleryState.index + 1); });
    $('#lightbox').on('keydown', function (e) {
      if (e.key === 'ArrowLeft') showLightbox(galleryState.index - 1);
      if (e.key === 'ArrowRight') showLightbox(galleryState.index + 1);
    });
  }

  // ---------------------------------------------------------------- ABOUT / CONTACT / FOOTER
  function renderContactInfo() {
    var s = DATA.site;
    var mail = '<a href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a>';
    var tel = '<a href="tel:' + esc(s.phone.replace(/-/g, '')) + '">' + esc(s.phone) + '</a>';
    var wa = '<a href="https://wa.me/' + esc(s.whatsapp) + '" target="_blank" rel="noopener">' + esc(s.whatsappDisplay) + '</a>';
    $('#aboutContact').html('Email: ' + mail + ' · Phone: ' + tel + ' · ' + esc(s.address.join(', ')));
    $('#footerContact').html(esc(s.address[0]) + '<br>' + esc(s.address[1]) + '<br>Email: ' + mail + '<br>Phone: ' + tel + ' · WhatsApp: ' + wa);
    var cards = [
      ['mail', 'Email', mail], ['phone', 'Phone', tel + '<br>WhatsApp: ' + wa],
      ['pin', 'Address', esc(s.address.join(', '))], ['clock', 'Opening hours', s.hours.map(esc).join('<br>')]
    ];
    $('#contactCards').html(cards.map(function (c) {
      return '<div class="col-sm-6 col-lg-3"><div class="contact-card"><span class="ic">' + ICON[c[0]] + '</span><div><h2>' + c[1] + '</h2><p>' + c[2] + '</p></div></div></div>';
    }).join(''));
    $('#year').text(new Date().getFullYear());
  }
  function bindContactForm() {
    $('#contactForm').on('submit', function (e) {
      e.preventDefault();
      var ok = true;
      $(this).find('[required]').each(function () {
        var valid = this.checkValidity() && $.trim(this.value).length > 0;
        $(this).toggleClass('is-invalid', !valid); if (!valid && ok) { ok = false; this.focus(); }
      });
      if (!ok) return;
      var name = $('#cName').val(), subject = $('#cSubject').val();
      var body = $('#cMessage').val() + '\n\n— ' + name + ' (' + $('#cEmail').val() + ')';
      var href = 'mailto:' + DATA.site.email + '?subject=' + encodeURIComponent(subject + ' — from ' + name) + '&body=' + encodeURIComponent(body);
      $('#contactSuccess').removeClass('d-none').html('Thank you, ' + esc(name) + '! Your email app should open with your message. If it does not, write to us at <a href="' + href + '">' + esc(DATA.site.email) + '</a>.').hide().fadeIn(300);
      window.location.href = href;
      this.reset();
    }).on('input', '.is-invalid', function () { if (this.checkValidity()) $(this).removeClass('is-invalid'); });
  }

  // ---------------------------------------------------------------- FEEDBACK & RATINGS
  var STAR_TEXT = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };
  function loadReviews() {
    var mine = store('bb-reviews') || [];
    reviews = mine.concat(DATA.reviews);
  }
  function renderFeedback() {
    var n = reviews.length;
    var avg = n ? reviews.reduce(function (a, r) { return a + r.rating; }, 0) / n : 0;
    var bars = '';
    for (var s = 5; s >= 1; s--) {
      var c = reviews.filter(function (r) { return r.rating === s; }).length;
      bars += '<div class="bar-row"><span>' + s + ' ★</span><div class="bar"><span style="width:' + (n ? c / n * 100 : 0) + '%"></span></div><span>' + c + '</span></div>';
    }
    $('#ratingSummary').html('<div class="rating-big"><div class="num">' + avg.toFixed(1) + '</div>' + starsHtml(avg) + '<div class="small">' + n + ' review' + (n === 1 ? '' : 's') + '</div></div><div class="bars">' + bars + '</div>');

    var sort = $('#reviewSort').val();
    var list = reviews.slice().sort(function (a, b) {
      if (sort === 'high') return b.rating - a.rating || (b.date > a.date ? 1 : -1);
      if (sort === 'low') return a.rating - b.rating || (b.date > a.date ? 1 : -1);
      return b.date > a.date ? 1 : b.date < a.date ? -1 : 0;
    });
    $('#reviewList').html(list.map(function (r) {
      return '<article class="review' + (r.fresh ? ' new' : '') + '"><div class="review-head"><span class="who">' + esc(r.name) + '</span><span class="when">' + niceDate(r.date) + '</span></div>' +
        starsHtml(r.rating) + (r.item ? ' <span class="item">· ' + esc(r.item) + '</span>' : '') + '<p>' + esc(r.comment) + '</p></article>';
    }).join(''));
    reviews.forEach(function (r) { delete r.fresh; });
  }
  function renderFeedbackItems() {
    var html = '<option value="">General experience</option>';
    DATA.site.categories.forEach(function (c) {
      html += '<optgroup label="' + esc(c) + '">' + DATA.products.filter(function (p) { return p.category === c; }).map(function (p) {
        return '<option>' + esc(p.name) + '</option>';
      }).join('') + '</optgroup>';
    });
    html += '<optgroup label="Merchandise">' + DATA.merchandise.map(function (m) { return '<option>' + esc(m.name) + '</option>'; }).join('') + '</optgroup>';
    $('#fbItem').html(html);
  }
  function bindFeedback() {
    $('#starInput').on('change', 'input', function () {
      $('#starText').text(this.value + ' / 5 — ' + STAR_TEXT[this.value]);
      $('#starError').addClass('d-none');
    });
    $('#reviewSort').on('change', renderFeedback);
    $('#feedbackForm').on('submit', function (e) {
      e.preventDefault();
      var rating = +$('input[name="rating"]:checked').val() || 0;
      var ok = true;
      $('#starError').toggleClass('d-none', rating > 0); if (!rating) ok = false;
      $(this).find('[required]').each(function () {
        var valid = this.checkValidity() && $.trim(this.value).length >= (+$(this).attr('minlength') || 1);
        $(this).toggleClass('is-invalid', !valid); if (!valid) ok = false;
      });
      if (!ok) { $(this).find('.is-invalid').first().trigger('focus'); return; }
      var review = { name: $.trim($('#fbName').val()), rating: rating, item: $('#fbItem').val(), comment: $.trim($('#fbComment').val()), date: todayIso() };
      var mine = store('bb-reviews') || [];
      mine.unshift(review); store('bb-reviews', mine);
      reviews.unshift($.extend({ fresh: true }, review));
      $('#reviewSort').val('new');
      renderFeedback(); renderHomeReviews();
      this.reset(); $('#starText').text('Select a rating');
      toast('Thank you for your feedback, ' + review.name + '!');
      $('html, body').animate({ scrollTop: $('#ratingSummary').offset().top - 120 }, 400);
    }).on('input', '.is-invalid', function () { if (this.checkValidity()) $(this).removeClass('is-invalid'); });
  }

  // ---------------------------------------------------------------- FAQ
  function renderFaq() {
    $('#faqList').html(DATA.faq.map(function (f, i) {
      return '<div class="accordion-item" data-faq="' + esc((f.q + ' ' + f.a).toLowerCase()) + '"><h2 class="accordion-header">' +
        '<button class="accordion-button' + (i ? ' collapsed' : '') + '" type="button" data-bs-toggle="collapse" data-bs-target="#faq' + i + '" aria-expanded="' + (i === 0) + '" aria-controls="faq' + i + '">' + esc(f.q) + '</button></h2>' +
        '<div id="faq' + i + '" class="accordion-collapse collapse' + (i ? '' : ' show') + '" data-bs-parent="#faqList"><div class="accordion-body">' + esc(f.a) + '</div></div></div>';
    }).join(''));
    $('#faqSearch').on('input', function () {
      var q = this.value.trim().toLowerCase(), shown = 0;
      $('#faqList .accordion-item').each(function () {
        var match = !q || $(this).data('faq').indexOf(q) > -1;
        $(this).toggle(match); if (match) shown++;
      });
      $('#faqEmpty').toggleClass('d-none', shown > 0);
    });
  }

  // ---------------------------------------------------------------- SITE MAP (from sitemap.xml)
  function renderSitemap() {
    var NS = 'https://bakerzbite.pk/schema/sitemap';
    var xml;
    try { xml = $.parseXML(DATA.sitemapXml); } catch (e) { $('#sitemapTree').html('<p>Could not read sitemap.xml.</p>'); return; }
    var groups = {}, order = [];
    $(xml).find('url').each(function () {
      var loc = $(this).find('loc').text();
      var title = this.getElementsByTagNameNS(NS, 'title')[0];
      var group = this.getElementsByTagNameNS(NS, 'group')[0];
      var sections = $.map(this.getElementsByTagNameNS(NS, 'section'), function (s) { return s.textContent; });
      var g = group ? group.textContent : 'Pages';
      if (!groups[g]) { groups[g] = []; order.push(g); }
      groups[g].push({ href: loc.replace(/^index\.html/, ''), title: title ? title.textContent : loc, sections: sections });
    });
    $('#sitemapTree').html(order.map(function (g) {
      return '<div class="col-md-6 col-lg-4"><div class="sm-group"><h2>' + esc(g) + '</h2><ul>' + groups[g].map(function (p) {
        var sub = '';
        if (p.sections.length) {
          sub = '<ul class="sm-sub">' + p.sections.map(function (s) {
            var link = p.href === '#menu' ? '#menu/' + encodeURIComponent(s) : p.href;
            return '<li><a href="' + esc(link) + '">' + esc(s) + '</a></li>';
          }).join('') + '</ul>';
        }
        return '<li><a href="' + esc(p.href) + '">' + esc(p.title) + '</a>' + sub + '</li>';
      }).join('') + '</ul></div></div>';
    }).join(''));
  }

  // ---------------------------------------------------------------- VISITOR COUNTER
  function visitorCounter() {
    var count = 1;
    try {
      count = parseInt(localStorage.getItem('bb-visits'), 10) || 0;
      if (!sessionStorage.getItem('bb-counted')) {
        count += 1; localStorage.setItem('bb-visits', count); sessionStorage.setItem('bb-counted', '1');
      }
    } catch (e) { count = 1; }
    $({ n: 0 }).animate({ n: count }, {
      duration: 900,
      step: function (now) { $('#visitorCount').text(('00000' + Math.round(now)).slice(-6)); },
      complete: function () { $('#visitorCount').text(('00000' + count).slice(-6)); }
    });
  }

  // ---------------------------------------------------------------- TICKER (date, time, location)
  var locationText = 'Detecting your location…';
  function buildTicker() {
    var offers = DATA.offers.filter(function (o) { return o.code; }).slice(0, 3).map(function (o) {
      return '<span class="ticker-item">' + ICON.tag + esc(o.title) + ': ' + esc(o.description) + ' Code ' + esc(o.code) + '</span>';
    }).join('');
    var group = '<span class="ticker-group">' +
      '<span class="ticker-item">' + ICON.calendar + '<span class="tk-date"></span></span>' +
      '<span class="ticker-item">' + ICON.clock + '<span class="tk-time"></span></span>' +
      '<span class="ticker-item">' + ICON.pin + '<span class="tk-loc"></span></span>' +
      '<span class="ticker-item">Bakerz Bite — Where smiles are served daily</span>' + offers + '</span>';
    $('#tickerTrack').html(group + group.replace('ticker-group', 'ticker-group" aria-hidden="true'));
    updateClock();
    setInterval(updateClock, 1000);
    $('.tk-loc').text(locationText);
    detectLocation();
  }
  function updateClock() {
    var now = new Date();
    $('.tk-date').text(now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    $('.tk-time').text(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }));
  }
  function setLocation(text) { locationText = text; $('.tk-loc').text(text); }
  function detectLocation() {
    if (!('geolocation' in navigator)) { setLocation('Location not supported by this browser'); return; }
    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude, lon = pos.coords.longitude;
      setLocation('You are at ' + Math.abs(lat).toFixed(3) + '° ' + (lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(lon).toFixed(3) + '° ' + (lon >= 0 ? 'E' : 'W'));
      // turn the coordinates into a place name (free service, no key needed)
      $.getJSON('https://api.bigdatacloud.net/data/reverse-geocode-client', { latitude: lat, longitude: lon, localityLanguage: 'en' })
        .done(function (r) {
          var parts = [r.city || r.locality, r.principalSubdivision, r.countryName].filter(function (x) { return x; });
          if (parts.length) setLocation('You are in ' + parts.join(', '));
        });
    }, function (err) {
      setLocation(err.code === 1 ? 'Location: permission denied — allow location to see it here' : 'Location unavailable right now');
    }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  // ---------------------------------------------------------------- "MORE" MENU (fade in / fade out)
  function bindMoreMenu() {
    var $menu = $('#moreMenu'), $btn = $('#moreToggle');
    function close() { $menu.stop(true, true).fadeOut(180); $btn.attr('aria-expanded', 'false'); }
    $btn.on('click', function (e) {
      e.stopPropagation();
      if ($menu.is(':visible')) close(); else { $menu.stop(true, true).fadeIn(220); $btn.attr('aria-expanded', 'true'); }
    });
    $(document).on('click', function (e) { if (!$(e.target).closest('.more-menu').length) close(); });
    $menu.on('keydown', function (e) { if (e.key === 'Escape') { close(); $btn.trigger('focus'); } });
    $btn.on('keydown', function (e) { if (e.key === 'Escape') close(); });
    $menu.on('click', 'a', close);
  }

  // ---------------------------------------------------------------- ROUTER (single-page navigation)
  function parseHash() {
    var h = decodeURIComponent(location.hash.replace(/^#/, ''));
    var parts = h.split('/');
    var page = PAGES.indexOf(parts[0]) > -1 ? parts[0] : 'home';
    return { page: page, param: parts.slice(1).join('/') };
  }

  function route(first) {
    var r = parseHash();
    if (r.page === 'menu' && r.param && DATA.site.categories.indexOf(r.param) > -1) {
      filters.cats = [r.param]; filters.q = ''; filters.diet = []; filters.tags = [];
      syncFilterControls(); renderMenu();
    }
    // menu colour stays changed for the current page
    $('.main-menu .nav-link').removeClass('active').removeAttr('aria-current');
    $('.main-menu [data-page="' + r.page + '"]').addClass('active').attr('aria-current', 'page');
    $('#moreToggle').toggleClass('active', MORE_PAGES.indexOf(r.page) > -1);
    var navCollapse = bootstrap.Collapse.getInstance(document.getElementById('mainNav'));
    if (navCollapse) navCollapse.hide();

    var $target = $('#page-' + r.page);
    document.title = (r.page === 'home' ? 'Bakerz Bite | Where smiles are served daily' : $target.data('title') + ' | Bakerz Bite');
    if (r.page === currentPage) { window.scrollTo(0, 0); return; }
    var $current = currentPage ? $('#page-' + currentPage) : $();
    currentPage = r.page;
    if (first || !$current.length) {
      $('.page').removeClass('active');
      $target.addClass('active');
      return;
    }
    // fade out the old page, fade in the new one
    $current.stop(true, true).fadeOut(160, function () {
      $current.removeClass('active').css('display', '');
      window.scrollTo(0, 0);
      $target.addClass('active').hide().fadeIn(320, function () { $target.css('display', ''); });
      document.getElementById('app').focus({ preventScroll: true });
    });
  }

  // ---------------------------------------------------------------- START
  $(function () {
    loadData().done(function (data) {
      DATA = data;
      buildCatalog();
      cart = store('bb-cart') || {};
      promoCode = store('bb-promo') || '';
      loadReviews();

      renderHome();
      renderFilterControls(); renderMenu(); bindMenu();
      renderOffers();
      renderMerch(); bindMerch();
      renderGallery(); bindGallery();
      renderContactInfo(); bindContactForm();
      renderFeedbackItems(); renderFeedback(); bindFeedback();
      renderFaq();
      renderSitemap();
      bindProductModal(); bindCart(); renderCart();
      bindMoreMenu();
      visitorCounter();
      buildTicker();

      $(window).on('hashchange', function () { route(false); });
      route(true);
    }).fail(function () {
      $('#app').html('<div class="container section"><h1>Sorry, the menu could not be loaded.</h1><p>Please refresh the page.</p></div>');
    });
  });
})(jQuery);