(function () {
  'use strict';

  var STORAGE_KEY = 'postBuddy.bookmarks.v1';
  var APP_KEY = 'webapp_postBuddy';
  var APP_VERSION = '001.001';
  var METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  var METHOD_ICONS = { GET: 'download', POST: 'upload', PUT: 'repeat', PATCH: 'edit', DELETE: 'trash' };
  var AUTH_TYPES = [
    { id: 'none', label: 'None' },
    { id: 'bearer', label: 'Bearer' },
    { id: 'basic', label: 'Basic' },
    { id: 'apikey', label: 'API Key' }
  ];
  var AUTH_PLACEHOLDERS = {
    none: 'No authentication',
    bearer: 'Bearer token',
    basic: 'user:pass, base64-encoded',
    apikey: 'API key value'
  };

  var ICONS = Object.assign({}, Buddy.ICONS, {
    spinner: Buddy.icon('spinner').replace('class="icon"', 'class="icon icon-spin"')
  });

  var dom = {};
  var state = {
    bookmarks: [],
    activeBookmarkId: null,
    currentMethod: 'GET',
    currentAuthType: 'none',
    sending: false,
    abortController: null,
    responseTab: 'body',
    lastResponseBody: '',
    panelOpen: false
  };

  function escapeHtml(str) {
    return Buddy.escapeHtml(str);
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function setBtnContent(btn, iconName, label) {
    btn.innerHTML = (iconName ? ICONS[iconName] : '') + (label ? '<span>' + escapeHtml(label) + '</span>' : '');
  }



  function loadBookmarks() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveBookmarks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bookmarks));
    } catch (e) {}
  }

  function findBookmark(id) {
    return state.bookmarks.find(function (b) { return b.id === id; });
  }



  function applyTheme(theme) {
    Buddy.theme.applyTheme(APP_KEY, theme);
  }

  function applyAccent(accent) {
    Buddy.theme.applyAccent(APP_KEY, accent);
  }

  function openSettingsModal() {
    Buddy.settings.open(APP_KEY, openModal, closeModal, { appVersion: APP_VERSION });
  }



  function renderMethodSelector() {
    dom.methodSelector.innerHTML = METHODS.map(function (m) {
      return '<button type="button" class="method-btn" data-method="' + m + '">' +
        '<span>' + m + '</span></button>';
    }).join('');
    updateMethodSelectorActive();
    Array.prototype.forEach.call(dom.methodSelector.querySelectorAll('.method-btn'), function (btn) {
      btn.addEventListener('click', function () {
        state.currentMethod = btn.getAttribute('data-method');
        updateMethodSelectorActive();
      });
    });
  }

  function updateMethodSelectorActive() {
    Array.prototype.forEach.call(dom.methodSelector.querySelectorAll('.method-btn'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-method') === state.currentMethod);
    });
  }



  function renderAuthSelector() {
    dom.authSelector.innerHTML = AUTH_TYPES.map(function (a) {
      return '<button type="button" class="method-btn" data-auth="' + a.id + '">' + a.label + '</button>';
    }).join('');
    updateAuthSelectorActive();
    Array.prototype.forEach.call(dom.authSelector.querySelectorAll('.method-btn'), function (btn) {
      btn.addEventListener('click', function () {
        state.currentAuthType = btn.getAttribute('data-auth');
        updateAuthSelectorActive();
        updateAuthKeyState();
      });
    });
  }

  function updateAuthSelectorActive() {
    Array.prototype.forEach.call(dom.authSelector.querySelectorAll('.method-btn'), function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-auth') === state.currentAuthType);
    });
  }

  function updateAuthKeyState() {
    dom.authKeyInput.placeholder = AUTH_PLACEHOLDERS[state.currentAuthType] || '';
    dom.authKeyInput.disabled = state.currentAuthType === 'none';
  }

  function getAuthHeaderValue() {
    var type = state.currentAuthType;
    var value = dom.authKeyInput.value.trim();
    if (type === 'none' || !value) return null;
    if (type === 'bearer') return 'Bearer ' + value;
    if (type === 'basic') return 'Basic ' + value;
    return value;
  }



  function shellQuote(str) {
    return "'" + String(str).replace(/'/g, "'\\''") + "'";
  }

  function buildCurlCommand() {
    var method = state.currentMethod;
    var url = dom.urlInput.value.trim() || '<url>';
    var headers = getHeadersObject();
    var authHeader = getAuthHeaderValue();
    if (authHeader) headers.Authorization = authHeader;

    var lines = ['curl -X ' + method + ' ' + shellQuote(url)];
    Object.keys(headers).forEach(function (key) {
      if (!key) return;
      lines.push('-H ' + shellQuote(key + ': ' + headers[key]));
    });
    if (method !== 'GET' && dom.payloadInput.value.trim()) {
      lines.push('-d ' + shellQuote(dom.payloadInput.value));
    }

    return lines.join(' \\\n  ');
  }

  function refreshCurlPreview() {
    dom.curlCommand.textContent = buildCurlCommand();
  }

  function updateCurlTriggerState() {
    var hasUrl = !!dom.urlInput.value.trim();
    dom.curlTriggerBtn.disabled = !hasUrl;
    dom.curlTrigger.classList.toggle('is-empty', !hasUrl);
  }

  function copyCurlCommand() {
    navigator.clipboard.writeText(dom.curlCommand.textContent).then(function () {
      dom.btnCopyCurl.innerHTML = ICONS.check;
      setTimeout(function () { dom.btnCopyCurl.innerHTML = ICONS.copy; }, 1200);
    }).catch(function () {});
  }



  function addHeaderRow(key, value) {
    var row = document.createElement('div');
    row.className = 'header-row';
    row.innerHTML =
      '<input type="text" class="form-control header-key" placeholder="Header name" autocomplete="off" spellcheck="false">' +
      '<input type="text" class="form-control header-value" placeholder="Header value" autocomplete="off" spellcheck="false">' +
      '<button type="button" class="btn btn-ghost btn-sm btn-icon header-row-remove" title="Remove header" aria-label="Remove header">' + ICONS.trash + '</button>';
    row.querySelector('.header-key').value = key || '';
    row.querySelector('.header-value').value = value || '';
    row.querySelector('.header-row-remove').addEventListener('click', function () {
      row.remove();
      if (!dom.headerRows.children.length) addHeaderRow();
    });
    dom.headerRows.appendChild(row);
    squareHeaderRemoveButton(row);
  }





  function squareHeaderRemoveButton(row) {
    var input = row.querySelector('.header-key');
    var btn = row.querySelector('.header-row-remove');
    var size = input.getBoundingClientRect().height;
    if (size) {
      btn.style.width = size + 'px';
      btn.style.height = size + 'px';
    }
  }

  function clearHeaderRows() {
    dom.headerRows.innerHTML = '';
  }

  function getHeaderRows() {
    return Array.prototype.map.call(dom.headerRows.querySelectorAll('.header-row'), function (row) {
      return { key: row.querySelector('.header-key').value, value: row.querySelector('.header-value').value };
    });
  }

  function getHeadersObject() {
    var obj = {};
    getHeaderRows().forEach(function (h) {
      var k = h.key.trim();
      if (k) obj[k] = h.value;
    });
    return obj;
  }



  function updateMainPanelVisibility() {
    var open = state.panelOpen || state.bookmarks.length > 0;
    dom.requestResponseGrid.hidden = !open;
    dom.mainEmptyHint.hidden = open;
  }

  function loadFormFromBookmark(bm) {
    state.currentMethod = METHODS.indexOf(bm.method) !== -1 ? bm.method : 'GET';
    updateMethodSelectorActive();
    dom.urlInput.value = bm.url || '';
    updateCurlTriggerState();
    dom.payloadInput.value = bm.payload || '';
    state.currentAuthType = AUTH_TYPES.some(function (a) { return a.id === bm.authType; }) ? bm.authType : 'none';
    updateAuthSelectorActive();
    updateAuthKeyState();
    dom.authKeyInput.value = bm.authKey || '';
    clearHeaderRows();
    if (bm.headers && bm.headers.length) {
      bm.headers.forEach(function (h) { addHeaderRow(h.key, h.value); });
    } else {
      addHeaderRow();
    }
  }

  function newRequest() {
    state.panelOpen = true;
    state.activeBookmarkId = null;
    state.currentMethod = 'GET';
    updateMethodSelectorActive();
    dom.urlInput.value = '';
    updateCurlTriggerState();
    dom.payloadInput.value = '';
    state.currentAuthType = 'none';
    updateAuthSelectorActive();
    updateAuthKeyState();
    dom.authKeyInput.value = '';
    clearHeaderRows();
    addHeaderRow();
    resetResponsePanel();
    renderBookmarks();
    dom.urlInput.focus();
  }

  function suggestBookmarkName(url, method) {
    try {
      var u = new URL(url);
      return method + ' ' + u.hostname + u.pathname;
    } catch (e) {
      return method + ' Request';
    }
  }

  function flashBtn(btn, iconName, label, revertIcon, revertLabel) {
    setBtnContent(btn, iconName, label);
    setTimeout(function () { setBtnContent(btn, revertIcon, revertLabel); }, 1200);
  }

  function flashSaved(btn, defaultIcon, defaultLabel) {
    flashBtn(btn, null, 'Saved!', defaultIcon, defaultLabel);
  }

  function flashFieldHighlight(input) {
    input.classList.remove('flash-highlight');
    void input.offsetWidth;
    input.classList.add('flash-highlight');
    input.addEventListener('animationend', function handler() {
      input.classList.remove('flash-highlight');
      input.removeEventListener('animationend', handler);
    });
  }

  function handleBookmarkClick() {
    var url = dom.urlInput.value.trim();
    if (!url) {
      dom.urlInput.focus();
      flashFieldHighlight(dom.urlInput);
      return;
    }
    var formData = {
      method: state.currentMethod,
      url: url,
      headers: getHeaderRows(),
      payload: dom.payloadInput.value,
      authType: state.currentAuthType,
      authKey: dom.authKeyInput.value
    };

    if (state.activeBookmarkId) {
      var bm = findBookmark(state.activeBookmarkId);
      if (bm) {
        bm.method = formData.method;
        bm.url = formData.url;
        bm.headers = formData.headers;
        bm.payload = formData.payload;
        bm.authType = formData.authType;
        bm.authKey = formData.authKey;
        saveBookmarks();
        renderBookmarks();
        flashSaved(dom.btnBookmark, null, 'Bookmark');
        return;
      }
    }

    openNameModal('Save Bookmark', suggestBookmarkName(formData.url, formData.method), function (name, saveAuthKey) {
      var newBm = {
        id: generateId(),
        name: name,
        method: formData.method,
        url: formData.url,
        headers: formData.headers,
        payload: formData.payload,
        authType: saveAuthKey ? formData.authType : 'none',
        authKey: saveAuthKey ? formData.authKey : ''
      };
      state.bookmarks.unshift(newBm);
      state.activeBookmarkId = newBm.id;
      saveBookmarks();
      renderBookmarks();
      flashSaved(dom.btnBookmark, null, 'Bookmark');
    }, { showAuthCheckbox: formData.authType !== 'none' && formData.authKey.trim() !== '' });
  }

  function renameBookmark(id) {
    var bm = findBookmark(id);
    if (!bm) return;
    openNameModal('Rename Bookmark', bm.name, function (name) {
      bm.name = name;
      saveBookmarks();
      renderBookmarks();
    });
  }

  function deleteBookmark(id) {
    var bm = findBookmark(id);
    if (!bm) return;
    openConfirmModal('Delete Bookmark', 'Delete "' + bm.name + '"? This cannot be undone.', 'Delete', function () {
      state.bookmarks = state.bookmarks.filter(function (b) { return b.id !== id; });
      if (state.activeBookmarkId === id) state.activeBookmarkId = null;
      saveBookmarks();
      renderBookmarks();
    }, { danger: true });
  }

  function selectBookmark(id) {
    var bm = findBookmark(id);
    if (!bm) return;
    state.panelOpen = true;
    state.activeBookmarkId = id;
    loadFormFromBookmark(bm);
    renderBookmarks();
  }



  function renderBookmarks() {
    updateMainPanelVisibility();
    dom.sidebarLoadSampleHint.hidden = state.bookmarks.length !== 0;
    var filterText = dom.bookmarkSearch.value.trim().toLowerCase();
    var list = state.bookmarks.filter(function (b) {
      if (!filterText) return true;
      return b.name.toLowerCase().indexOf(filterText) !== -1 || (b.url || '').toLowerCase().indexOf(filterText) !== -1;
    });

    if (!list.length) {
      dom.bookmarkList.innerHTML = state.bookmarks.length
        ? '<p class="empty-hint">No bookmarks match your search.</p>'
        : '';
      return;
    }

    dom.bookmarkList.innerHTML = list.map(function (b) {
      var active = b.id === state.activeBookmarkId ? ' active' : '';
      return '<li class="bookmark-item' + active + '" data-id="' + b.id + '" tabindex="0">' +
        '<span class="method-badge" data-method="' + b.method + '">' + escapeHtml(b.method) + '</span>' +
        '<span class="bookmark-item-body">' +
        '<span class="bookmark-item-name">' + escapeHtml(b.name) + '</span>' +
        '<span class="bookmark-item-url">' + escapeHtml(b.url || '(no url)') + '</span>' +
        '</span>' +
        '<span class="bookmark-item-actions">' +
        '<button type="button" class="btn btn-ghost btn-sm btn-icon bookmark-edit" title="Rename" aria-label="Rename bookmark">' + ICONS.edit + '</button>' +
        '<button type="button" class="btn btn-ghost btn-sm btn-icon bookmark-delete" title="Delete" aria-label="Delete bookmark">' + ICONS.trash + '</button>' +
        '</span>' +
        '</li>';
    }).join('');

    Array.prototype.forEach.call(dom.bookmarkList.querySelectorAll('.bookmark-item'), function (item) {
      var id = item.getAttribute('data-id');
      item.addEventListener('click', function (e) {
        if (e.target.closest('.bookmark-item-actions')) return;
        selectBookmark(id);
      });
      item.querySelector('.bookmark-edit').addEventListener('click', function (e) {
        e.stopPropagation();
        renameBookmark(id);
      });
      item.querySelector('.bookmark-delete').addEventListener('click', function (e) {
        e.stopPropagation();
        deleteBookmark(id);
      });
    });
  }



  function exportBookmarks() {
    var blob = new Blob([JSON.stringify(state.bookmarks, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'postbuddy-bookmarks.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function normalizeImportedBookmark(item) {
    return {
      id: generateId(),
      name: (item.name ? String(item.name).trim() : '') || 'Untitled request',
      method: METHODS.indexOf(item.method) !== -1 ? item.method : 'GET',
      url: item.url || '',
      headers: Array.isArray(item.headers) ? item.headers : [],
      payload: item.payload || '',
      authType: AUTH_TYPES.some(function (a) { return a.id === item.authType; }) ? item.authType : 'none',
      authKey: item.authKey || ''
    };
  }

  function findBookmarkByName(name) {
    var target = name.trim().toLowerCase();
    return state.bookmarks.find(function (b) { return b.name.trim().toLowerCase() === target; });
  }

  function applyImportedBookmarks(incoming, override) {
    incoming.forEach(function (b) {
      var existing = override ? findBookmarkByName(b.name) : null;
      if (existing) {
        existing.method = b.method;
        existing.url = b.url;
        existing.headers = b.headers;
        existing.payload = b.payload;
        existing.authType = b.authType;
        existing.authKey = b.authKey;
      } else {
        state.bookmarks.push(b);
      }
    });
    saveBookmarks();
    renderBookmarks();
  }

  function openImportConflictModal(onOverride, onAppend) {
    var html =
      '<p class="modal-message">One or more imported bookmarks share a name with a bookmark you already have. ' +
      'Override the existing ones with the imported versions, or append the imported ones as separate new bookmarks?</p>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="btnImportNo">No, Append</button>' +
      '<button class="btn btn-primary" id="btnImportYes">Yes, Override</button>' +
      '</div>';
    openModal('Import Bookmarks', html, function (body) {
      body.querySelector('#btnImportNo').addEventListener('click', function () {
        closeModal();
        onAppend();
      });
      body.querySelector('#btnImportYes').addEventListener('click', function () {
        closeModal();
        onOverride();
      });
    });
  }

  function importBookmarksFromFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try {
        data = JSON.parse(reader.result);
        if (!Array.isArray(data)) throw new Error('Invalid file');
      } catch (e) {
        openModal('Import Failed', '<p class="modal-message">Could not import that file. Make sure it is a PostBuddy bookmarks JSON export.</p>' +
          '<div class="modal-actions"><button class="btn btn-primary" id="btnImportErrOk">OK</button></div>', function (body) {
          body.querySelector('#btnImportErrOk').addEventListener('click', closeModal);
        });
        return;
      }

      var incoming = data.map(normalizeImportedBookmark);
      var hasConflict = incoming.some(function (b) { return !!findBookmarkByName(b.name); });

      if (hasConflict) {
        openImportConflictModal(
          function () { applyImportedBookmarks(incoming, true); },
          function () { applyImportedBookmarks(incoming, false); }
        );
      } else {
        applyImportedBookmarks(incoming, false);
      }
    };
    reader.readAsText(file);
  }




  function handleLoadSample(e) {
    e.preventDefault();
    if (window.location.protocol === 'file:') {
      openConfirmModal(
        'Server Required',
        'Loading sample requests needs the app to be served from a local or remote server — it can’t read local files when index.html is opened directly from your file system. Instead, download postBuddy_sample.json from cdnBuddy/samples and use the Import button (top-left) to load it.',
        'OK', function () {});
      return;
    }
    fetch('https://isafuianish-dev.github.io/webapp_cdnBuddy/samples/postBuddy_sample.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Request failed');
        return res.json();
      })
      .then(function (data) {
        if (!Array.isArray(data) || !data.length) throw new Error('Invalid data');
        var incoming = data.map(normalizeImportedBookmark);
        var hasConflict = incoming.some(function (b) { return !!findBookmarkByName(b.name); });
        if (hasConflict) {
          openImportConflictModal(
            function () { applyImportedBookmarks(incoming, true); },
            function () { applyImportedBookmarks(incoming, false); }
          );
        } else {
          applyImportedBookmarks(incoming, false);
        }
      })
      .catch(function () {
        openConfirmModal('Load Failed', 'Could not load the sample requests.', 'OK', function () {});
      });
  }



  function handleSend() {
    if (state.sending) return;
    var url = dom.urlInput.value.trim();
    if (!url) { dom.urlInput.focus(); return; }

    var method = state.currentMethod;
    var headers = getHeadersObject();
    var authHeader = getAuthHeaderValue();
    if (authHeader) headers.Authorization = authHeader;
    var body;
    if (method !== 'GET' && dom.payloadInput.value.trim()) {
      body = dom.payloadInput.value;
    }

    var controller = new AbortController();
    state.abortController = controller;
    state.sending = true;
    setBtnContent(dom.btnSend, 'spinner', 'Send');
    dom.btnSend.disabled = true;

    var startTime = performance.now();
    fetch(url, { method: method, headers: headers, body: body, signal: controller.signal })
      .then(function (response) {
        return response.text().then(function (text) {
          renderResponse(response, text, performance.now() - startTime);
        });
      })
      .catch(function (err) {
        var elapsed = performance.now() - startTime;
        if (err.name === 'AbortError') {
          renderResponseError('Request cancelled.', elapsed);
        } else {
          renderResponseError('Request failed: ' + err.message + '. This may be a network issue or the server blocking cross-origin requests (CORS).', elapsed);
        }
      })
      .then(function () {
        state.sending = false;
        state.abortController = null;
        dom.btnSend.disabled = false;
        flashBtn(dom.btnSend, null, 'Sent!', null, 'Send');
      });
  }

  function handleCancel() {
    if (state.sending && state.abortController) {
      state.abortController.abort();
      return;
    }
    if (state.activeBookmarkId) {
      var bm = findBookmark(state.activeBookmarkId);
      if (bm) { loadFormFromBookmark(bm); return; }
    }
    newRequest();
  }



  function resetResponsePanel() {
    dom.responseContent.hidden = true;
    dom.responseEmpty.hidden = false;
    state.lastResponseBody = '';
  }

  function formatSize(bytes) {
    return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB';
  }

  function renderResponse(response, text, elapsedMs) {
    dom.responseEmpty.hidden = true;
    dom.responseContent.hidden = false;
    state.lastResponseBody = text;

    var statusClass = 'status-badge';
    if (response.status >= 200 && response.status < 300) statusClass += ' status-2xx';
    else if (response.status >= 400 && response.status < 500) statusClass += ' status-4xx';
    else if (response.status >= 500) statusClass += ' status-5xx';

    dom.responseMeta.innerHTML =
      '<span class="' + statusClass + '">' + response.status + ' ' + escapeHtml(response.statusText || '') + '</span>' +
      '<span class="response-meta-item">' + Math.round(elapsedMs) + ' ms</span>' +
      '<span class="response-meta-item">' + formatSize(new Blob([text]).size) + '</span>';

    var pretty = text;
    try { pretty = JSON.stringify(JSON.parse(text), null, 2); } catch (e) {}
    dom.responseBody.textContent = pretty || '(empty body)';
    dom.responseBody.classList.remove('response-error');

    var headerRows = [];
    response.headers.forEach(function (value, key) { headerRows.push({ key: key, value: value }); });
    renderResponseHeaders(headerRows);

    setResponseTab('body');
  }

  function renderResponseError(message, elapsedMs) {
    dom.responseEmpty.hidden = true;
    dom.responseContent.hidden = false;
    state.lastResponseBody = '';

    dom.responseMeta.innerHTML = '<span class="status-badge status-4xx">ERROR</span>' +
      (elapsedMs != null ? '<span class="response-meta-item">' + Math.round(elapsedMs) + ' ms</span>' : '');
    dom.responseBody.textContent = message;
    dom.responseBody.classList.add('response-error');
    renderResponseHeaders([]);
    setResponseTab('body');
  }

  function renderResponseHeaders(rows) {
    if (!rows.length) {
      dom.responseHeaders.innerHTML = '<p class="empty-hint">No headers.</p>';
      return;
    }
    dom.responseHeaders.innerHTML = rows.map(function (h) {
      return '<div class="response-header-row"><span class="response-header-name">' + escapeHtml(h.key) +
        '</span><span class="response-header-value">' + escapeHtml(h.value) + '</span></div>';
    }).join('');
  }

  function setResponseTab(tab) {
    state.responseTab = tab;
    dom.tabBody.classList.toggle('active', tab === 'body');
    dom.tabHeaders.classList.toggle('active', tab === 'headers');
    dom.bodyView.hidden = tab !== 'body';
    dom.responseHeaders.hidden = tab !== 'headers';
  }

  function copyResponseBody() {
    if (!state.lastResponseBody) return;
    navigator.clipboard.writeText(state.lastResponseBody).then(function () {
      dom.btnCopyBody.innerHTML = ICONS.check;
      setTimeout(function () { dom.btnCopyBody.innerHTML = ICONS.copy; }, 1200);
    }).catch(function () {});
  }



  var modalApi = Buddy.modal.init();
  var openModal = modalApi.open;
  var closeModal = modalApi.close;

  function openConfirmModal(title, message, confirmLabel, onConfirm, opts) {
    opts = opts || {};
    var danger = opts.danger ? 'btn-danger' : 'btn-primary';
    var html =
      '<p class="modal-message">' + escapeHtml(message) + '</p>' +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="btnConfirmNo">' + escapeHtml(opts.cancelLabel || 'Cancel') + '</button>' +
      '<button class="btn ' + danger + '" id="btnConfirmYes">' + escapeHtml(confirmLabel) + '</button>' +
      '</div>';
    openModal(title, html, function (body) {
      body.querySelector('#btnConfirmNo').addEventListener('click', closeModal);
      body.querySelector('#btnConfirmYes').addEventListener('click', function () {
        closeModal();
        onConfirm();
      });
    });
  }

  function openNameModal(title, defaultValue, onSave, opts) {
    opts = opts || {};
    var checkboxHtml = opts.showAuthCheckbox
      ? '<label class="checkbox-row">' +
        '<input type="checkbox" id="bookmarkSaveAuthKey" class="checkbox-input">' +
        '<span class="checkbox-box">' + ICONS.check + '</span>' +
        'Also save auth key with this bookmark' +
        '</label>'
      : '';
    var html =
      '<div class="form-group"><label for="bookmarkNameInput">Name</label>' +
      '<input type="text" id="bookmarkNameInput" class="form-control" placeholder="e.g. Get all users"></div>' +
      checkboxHtml +
      '<div class="modal-actions">' +
      '<button class="btn btn-ghost" id="btnNameCancel">Cancel</button>' +
      '<button class="btn btn-primary" id="btnNameSave">Save</button>' +
      '</div>';
    openModal(title, html, function (body) {
      var input = body.querySelector('#bookmarkNameInput');
      input.value = defaultValue || '';
      input.focus();
      input.select();
      body.querySelector('#btnNameCancel').addEventListener('click', closeModal);
      body.querySelector('#btnNameSave').addEventListener('click', submit);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); submit(); }
      });
      function submit() {
        var val = input.value.trim();
        if (!val) { input.focus(); return; }
        var authCheckbox = body.querySelector('#bookmarkSaveAuthKey');
        var saveAuthKey = !!(authCheckbox && authCheckbox.checked);
        closeModal();
        onSave(val, saveAuthKey);
      }
    });
  }



  function cacheDom() {
    dom.btnSettings = document.getElementById('btnSettings');
    dom.bookmarkSearch = document.getElementById('bookmarkSearch');
    dom.btnNewRequest = document.getElementById('btnNewRequest');
    dom.btnExportBookmarks = document.getElementById('btnExportBookmarks');
    dom.fileImportBookmarks = document.getElementById('fileImportBookmarks');
    dom.fileBtnIcon = document.getElementById('fileBtnIcon');
    dom.bookmarkList = document.getElementById('bookmarkList');
    dom.sidebarLoadSampleHint = document.getElementById('sidebarLoadSampleHint');
    dom.requestResponseGrid = document.getElementById('requestResponseGrid');
    dom.mainEmptyHint = document.getElementById('mainEmptyHint');
    dom.methodSelector = document.getElementById('methodSelector');
    dom.urlInput = document.getElementById('urlInput');
    dom.payloadInput = document.getElementById('payloadInput');
    dom.authSelector = document.getElementById('authSelector');
    dom.authKeyInput = document.getElementById('authKeyInput');
    dom.curlTrigger = document.getElementById('curlTrigger');
    dom.curlTriggerBtn = document.getElementById('curlTriggerBtn');
    dom.curlCommand = document.getElementById('curlCommand');
    dom.btnCopyCurl = document.getElementById('btnCopyCurl');
    dom.headerRows = document.getElementById('headerRows');
    dom.btnAddHeader = document.getElementById('btnAddHeader');
    dom.btnBookmark = document.getElementById('btnBookmark');
    dom.btnSend = document.getElementById('btnSend');
    dom.btnCancel = document.getElementById('btnCancel');
    dom.responseEmpty = document.getElementById('responseEmpty');
    dom.responseContent = document.getElementById('responseContent');
    dom.responseMeta = document.getElementById('responseMeta');
    dom.tabBody = document.getElementById('tabBody');
    dom.tabHeaders = document.getElementById('tabHeaders');
    dom.bodyView = document.getElementById('bodyView');
    dom.responseBody = document.getElementById('responseBody');
    dom.btnCopyBody = document.getElementById('btnCopyBody');
    dom.responseHeaders = document.getElementById('responseHeaders');
  }

  function wireEvents() {
    dom.btnSettings.addEventListener('click', openSettingsModal);
    dom.bookmarkSearch.addEventListener('input', renderBookmarks);
    dom.btnNewRequest.addEventListener('click', newRequest);
    dom.btnExportBookmarks.addEventListener('click', exportBookmarks);
    dom.fileImportBookmarks.addEventListener('change', function () {
      var file = this.files[0];
      if (file) importBookmarksFromFile(file);
      this.value = '';
    });
    dom.sidebarLoadSampleHint.addEventListener('click', function (e) {
      if (e.target.closest('#linkLoadSampleSidebar')) handleLoadSample(e);
    });
    dom.btnAddHeader.addEventListener('click', function () { addHeaderRow(); });
    dom.btnBookmark.addEventListener('click', handleBookmarkClick);
    dom.btnSend.addEventListener('click', handleSend);
    dom.btnCancel.addEventListener('click', handleCancel);
    dom.urlInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); handleSend(); }
    });
    dom.urlInput.addEventListener('input', updateCurlTriggerState);
    dom.tabBody.addEventListener('click', function () { setResponseTab('body'); });
    dom.tabHeaders.addEventListener('click', function () { setResponseTab('headers'); });
    dom.btnCopyBody.addEventListener('click', copyResponseBody);
    dom.curlTrigger.addEventListener('mouseenter', refreshCurlPreview);
    dom.curlTriggerBtn.addEventListener('focus', refreshCurlPreview);
    dom.btnCopyCurl.addEventListener('click', copyCurlCommand);
  }

  function init() {
    cacheDom();
    dom.btnSettings.innerHTML = ICONS.settings;
    dom.btnExportBookmarks.innerHTML = ICONS.download;
    dom.fileBtnIcon.innerHTML = ICONS.upload;
    setBtnContent(dom.btnAddHeader, 'plus', 'Add');
    setBtnContent(dom.btnBookmark, null, 'Bookmark');
    setBtnContent(dom.btnSend, null, 'Send');
    setBtnContent(dom.btnCancel, null, 'Cancel');
    dom.btnCopyBody.innerHTML = ICONS.copy;
    dom.curlTriggerBtn.innerHTML = ICONS.output;
    dom.btnCopyCurl.innerHTML = ICONS.copy;

    renderMethodSelector();
    renderAuthSelector();
    updateAuthKeyState();
    updateCurlTriggerState();
    addHeaderRow();

    state.bookmarks = loadBookmarks();
    renderBookmarks();

    wireEvents();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
