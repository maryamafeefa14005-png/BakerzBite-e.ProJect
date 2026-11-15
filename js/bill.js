(function () {
  var REC_KEY = 'bb_recipient', ORD_KEY = 'bb_orders';
  var money = function (n) { return 'Rs. ' + Math.round(n || 0).toLocaleString('en-US'); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var load = function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  var save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  var SLIP_CSS =
    '.slip{max-width:380px;margin:0 auto;background:#fff;border:1px solid #F3D3E1;border-radius:20px;overflow:hidden;font-family:system-ui,Arial,sans-serif;color:#4B2340}' +
    '.slip-top{background:#4B2340;color:#fff;text-align:center;padding:22px 16px}' +
    '.slip-tick{width:54px;height:54px;border-radius:50%;background:#1E7A46;color:#fff;font-size:30px;line-height:54px;margin:0 auto 8px}' +
    '.slip-top h3{margin:0;font-size:1.15rem;color:#fff}' +
    '.slip-amt{font-size:2rem;font-weight:800;margin-top:6px}' +
    '.slip-body{padding:16px 20px}' +
    '.slip-row{display:flex;justify-content:space-between;gap:12px;padding:6px 0;font-size:.92rem}' +
    '.slip-row span:first-child{color:#6E4A63}' +
    '.slip-row span:last-child{font-weight:700;text-align:right}' +
    '.slip-hr{border-top:2px dashed #F3D3E1;margin:10px 0}' +
    '.slip-total{font-size:1.1rem;font-weight:800}' +
    '.slip-foot{text-align:center;font-size:.8rem;color:#6E4A63;padding:0 16px 18px}';

  document.body.insertAdjacentHTML('beforeend',
    '<style>' + SLIP_CSS + '</style>' +
    '<div class="modal fade" id="billModal" tabindex="-1" aria-labelledby="billTitle" aria-hidden="true">' +
    '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content">' +
    '<div class="modal-header"><h2 class="modal-title h4" id="billTitle">Payment slip</h2>' +
    '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>' +
    '<div class="modal-body" id="billBody"></div></div></div></div>');

  var modalEl = document.getElementById('billModal');
  var body = document.getElementById('billBody');

  function row(label, value) {
    return '<div class="slip-row"><span>' + label + '</span><span>' + esc(value) + '</span></div>';
  }

  function slipHtml(o) {
    var items = o.items.map(function (i) {
      return '<div class="slip-row"><span>' + esc(i.name) + ' × ' + i.qty + '</span><span>' + money(i.price * i.qty) + '</span></div>';
    }).join('');
    return '<div class="slip"><div class="slip-top"><div class="slip-tick">✓</div>' +
      '<h3>Order Placed Successfully</h3><div class="slip-amt">' + money(o.total) + '</div></div>' +
      '<div class="slip-body">' +
      row('Reference no.', o.no) +
      row('Date &amp; time', o.date) +
      row('Name', o.rec.name) +
      row('Phone', o.rec.phone) +
      row('Address', o.rec.address) +
      (o.deliveryDate ? row('Delivery date', o.deliveryDate) : '') +
      (o.notes ? row('Notes', o.notes) : '') +
      '<div class="slip-hr"></div>' + items + '<div class="slip-hr"></div>' +
      row('Subtotal', money(o.subtotal)) +
      (o.discount ? row('Discount', '- ' + money(o.discount)) : '') +
      row('Delivery', o.delivery ? money(o.delivery) : 'Free') +
      '<div class="slip-row slip-total"><span>Total</span><span>' + money(o.total) + '</span></div>' +
      '<div class="slip-row"><span>Payment</span><span>Cash on delivery</span></div>' +
      '</div><div class="slip-foot">Bakerz Bite · Where smiles are served daily.<br>Thank you for your order!</div></div>';
  }

  window.BB_Bill = {
    open: function (order) {
      var rec = order.customer || {};
      save(REC_KEY, rec);

      var orders = load(ORD_KEY, []);
      var subtotal = order.items.reduce(function (s, i) { return s + i.price * i.qty; }, 0);
      var discount = order.discount || 0, delivery = order.delivery || 0;
      var o = {
        no: 'BB-' + String(orders.length + 1).padStart(5, '0'),
        date: new Date().toLocaleString('en-GB'),
        rec: rec, items: order.items, subtotal: subtotal,
        discount: discount, delivery: delivery,
        total: subtotal - discount + delivery,
        deliveryDate: order.date || '', notes: order.notes || ''
      };
      orders.push(o); save(ORD_KEY, orders);

      body.innerHTML = slipHtml(o) +
        '<div class="d-flex gap-2 mt-3"><button class="btn btn-rose flex-grow-1" id="billPrint" type="button">Print / Save PDF</button>' +
        '<button class="btn btn-outline-rose" type="button" data-bs-dismiss="modal">Close</button></div>';

      document.getElementById('billPrint').onclick = function () {
        var w = window.open('', '_blank');
        if (!w) return;
        w.document.write('<html><head><title>' + o.no + '</title><style>body{padding:24px;background:#fff}' + SLIP_CSS + '</style></head><body>' + slipHtml(o) + '</body></html>');
        w.document.close();
        w.onload = function () { w.print(); };
      };

      bootstrap.Modal.getOrCreateInstance(modalEl).show();
      if (order.onDone) order.onDone(o);
    }
  };
})();