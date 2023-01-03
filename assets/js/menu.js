import { undo, redo } from '@codemirror/history';
import menus from '../config/menus';
import languages from '../config/languages';
import create from './create';
import typeface from '../config/typeface';
import emoji from '../config/emoji';
import emotion from '../config/emotion';
import { upload, compressImg } from "./utils"

export default class Menu {
  constructor(cm) {
    this._cm = cm;
    this._options = null;
    this.handleCreateModal();
    this.handleCreateMenu();
  }

  /**
   * @description: Phương pháp nội bộ - cửa sổ bật lên
   * @param {*}
   * @return {*}
   */
  $openModal(options) {
    const defaultOptions = {
      title: 'Gợi ý',
      innerHtml: 'Nội dung',
      hasFooter: true,
      cancel: () => { },
      confirm: () => { },
      callback: () => { },
    }
    this._options = { ...defaultOptions, ...options };
    const { title, innerHtml, hasFooter, callback } = this._options;
    $('.cm-modal__wrapper-head--text').html(title);
    $('.cm-modal__wrapper-body').html(innerHtml);
    $('.cm-modal__wrapper-foot').css('display', hasFooter ? '' : 'none')
    $('.cm-modal').addClass('active');
    $('body').addClass('lock-scroll');
    callback();
  }

  /**
   * @description: Phương pháp nội bộ - tải hình ảnh lên
   * @param {*} src
   * @return {*}
   */
  $loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => setTimeout(() => resolve(true), 320);
      img.onerror = () => resolve(false);
    })
  }

  /**
   * @description: Phương thức nội bộ - Thanh cuộn
   * @param {*} options
   * @param {*} type
   * @param {*} title
   * @param {*} sessionStorageKey
   * @return {*}
   */
  $createMenuModal(options, type, title, sessionStorageKey) {
    let menuHtml = '';
    let contentHtml = '';
    Object.keys(options).forEach(key => {
      const isArray = Array.isArray(options[key]);
      const list = isArray ? options[key] : options[key].split(' ');
      menuHtml += `<div class="menu_head__item" data-key="${key}">${key}</div>`;
      contentHtml += `<div data-type="${type}" class="menu_content" data-key="${key}">${list.map(item => `<div class="menu_content__item" data-text="${item.text || item}">${item.icon || item}</div>`).join(' ')}</div>`;
    })
    this.$openModal({
      title,
      hasFooter: false,
      innerHtml: `<div class="menu_head">${menuHtml}</div>${contentHtml}`,
      callback: () => {
        const _this = this;
        const menuHead = $('.cm-modal .menu_head');

        $('.cm-modal .menu_content__item').on('click', function () {
          const text = $(this).attr('data-text');
          $('.cm-modal').removeClass('active');
          _this.$replaceSelection(` ${text} `);
          _this.$focus();
        });

        $(".cm-modal .menu_head__item").on('click', function () {
          const key = $(this).attr('data-key');
          const activeMenu = $(`.cm-modal .menu_head__item[data-key="${key}"]`);
          const activeContent = $(`.cm-modal .menu_content[data-key="${key}"]`);
          activeMenu.addClass('active').siblings().removeClass('active');
          activeContent.addClass('active').siblings().removeClass('active');
          menuHead[0].scrollTo({
            left: activeMenu[0].offsetLeft - menuHead[0].offsetWidth / 2 + activeMenu[0].offsetWidth / 2 - 15,
            behavior: "smooth",
          });
          sessionStorage.setItem(sessionStorageKey, key);
        })
        // Kích hoạt tùy chọn đánh dấu trên mục nhập
        const sessionStorageValue = sessionStorage.getItem(sessionStorageKey)
        if (sessionStorageValue) {
          const activeMenu = $(`.cm-modal .menu_head__item[data-key="${sessionStorageValue}"]`);
          const activeContent = $(`.cm-modal .menu_content[data-key="${sessionStorageValue}"]`);
          activeMenu.addClass('active').siblings().removeClass('active');
          activeContent.addClass('active').siblings().removeClass('active');
          menuHead[0].scrollTo({
            left: activeMenu[0].offsetLeft - menuHead[0].offsetWidth / 2 + activeMenu[0].offsetWidth / 2 - 15,
            behavior: "smooth",
          });
        } else {
          $(`.cm-modal .menu_head__item`).eq(0).addClass('active').siblings().removeClass('active');
          $(`.cm-modal .menu_content`).eq(0).addClass('active').siblings().removeClass('active');
        }
        // Đặt chức năng lazy loading
        const lazyLoadImgs = document.querySelectorAll(`.cm-modal .menu_content[data-type="emotion"] .emotion`);
        if (IntersectionObserver) {
          const observer = new IntersectionObserver((changes) => {
            changes.forEach(async change => {
              if (!change.isIntersecting) return;
              const loaded = await this.$loadImage(change.target.getAttribute('data-src'));
              loaded && (change.target.src = change.target.getAttribute('data-src'));
              observer.unobserve(change.target);
            })
          });
          lazyLoadImgs.forEach(item => observer.observe(item));
        } else {
          lazyLoadImgs.forEach(item => (item.src = item.getAttribute('data-src')));
        }
      }
    });
  }

  /**
   * @description: Phương thức nội bộ - đặt vị trí của con trỏ
   * @param {*} anchor
   * @return {*}
   */
  $setCursor(anchor) {
    this._cm.dispatch({ selection: { anchor } });
  }

  /**
   * @description: Lấy vị trí bắt đầu của con trỏ
   * @param {*}
   * @return {*}
   */
  $getCursor() {
    return this._cm.state.selection.main.head;
  }

  /**
   * @description: Phương thức nội bộ - lấy vị trí con trỏ trên dòng hiện tại
   * @param {*}
   * @return {*}
   */
  $getLineCh() {
    const head = this._cm.state.selection.main.head;
    const line = this._cm.state.doc.lineAt(head);
    return head - line.from;
  }

  /**
   * @description: Phương pháp nội bộ - Tiêu điểm của biên tập viên
   * @param {*}
   * @return {*}
   */
  $focus() {
    this._cm.focus();
  }

  /**
   * @description: Phương thức nội bộ - lấy văn bản đã chọn
   * @param {*}
   * @return {*}
   */
  $getSelection() {
    return this._cm.state.sliceDoc(this._cm.state.selection.main.from, this._cm.state.selection.main.to);
  }

  /**
   * @description: Phương pháp Nội bộ - Chèn & Thay thế Văn bản
   * @param {*} str
   * @return {*}
   */
  $replaceSelection(str) {
    this._cm.dispatch(this._cm.state.replaceSelection(str));
  }

  /**
   * @description: Tạo một phương thức
   * @param {*}
   * @return {*}
   */
  handleCreateModal() {
    $('body').append(`
      <div class="cm-modal">
        <div class="cm-modal__wrapper">
          <div class="cm-modal__wrapper-head">
            <div class="cm-modal__wrapper-head--text"></div>
            <div class="cm-modal__wrapper-head--close">×</div>
          </div>
          <div class="cm-modal__wrapper-body"></div>
          <div class="cm-modal__wrapper-foot">
            <button class="cm-modal__wrapper-foot--cancle">Hủy bỏ</button>
            <button class="cm-modal__wrapper-foot--confirm">Xác nhận</button>
            </div>
        </div>
      </div>
    `);
    $('.cm-modal__wrapper-foot--cancle, .cm-modal__wrapper-head--close').on('click', () => {
      this._options.cancel();
      !$('.cm-container').hasClass('fullscreen') && $('body').removeClass('lock-scroll');
      $('.cm-modal').removeClass('active');
    });
    $('.cm-modal__wrapper-foot--confirm').on('click', () => {
      this._options.confirm();
      !$('.cm-container').hasClass('fullscreen') && $('body').removeClass('lock-scroll');
      $('.cm-modal').removeClass('active');
    });
  }

  /**
   * @description: Tạo chức năng soạn thảo
   * @param {*}
   * @return {*}
   */
  handleCreateMenu() {
    menus.forEach(item => {
      const el = $(`<div class="cm-menu-item" title="${item.title}">${item.innerHTML}${item.children ? '<div class="cm-menu-item-dropdown"></div>' : ''}</div>`);
      item.children && item.children.forEach(subItem => {
        const subEl = $(`<div class="cm-menu-item-dropdown-content" title="${subItem.title}">${subItem.innerHTML}</div>`);
        subEl.on('click', () => {
          switch (subItem.type) {
            case 'bold':
              this.handleBold();
              break;
            case 'italic':
              this.handleItalic();
              break;
            case 'line-through':
              this.handleLineThrough();
              break;
            case 'marker':
              this.handleInlineMarker();
              break;
            case 'split-line':
              this.handleSplitLine();
              break;
            case 'block-quotations':
              this.handleBlockQuotations();
              break;
            case 'title':
              this.handleTitle(subItem);
              break;
            case 'clean':
              this.handleClean();
              break;
            case 'download':
              this.handleDownload();
              break;
            case 'draft':
              this.handleDraft();
              break;
            case 'publish':
              this.handlePublish();
              break;
            case 'indent':
              this.handleIndent();
              break;
            case 'ordered-list':
              this.handleOrderedList();
              break;
            case 'unordered-list':
              this.handleUnorderedList();
              break;
            case 'time':
              this.handleTime();
              break;
            case 'link':
              this.handleLink();
              break;
            case 'picture':
              this.handlePicture();
              break;
            case 'table':
              this.handleTable();
              break;
            case 'code-block':
              this.handleCodeBlock();
              break;
            case 'html':
              this.handleHtml();
              break;
            case 'typeface':
              this.handleTypeface();
              break;
            case 'emoji':
              this.handleEmoji();
              break;
            case 'emotion':
              this.handleEmotion();
              break;
            case 'upload':
              this.handleUpload();
              break;
            case 'task-no':
              this.handleTask(false);
              break;
            case 'task-yes':
              this.handleTask(true);
              break;
          }
        });
        el.children('.cm-menu-item-dropdown').append(subEl);
      });

      el.on('click', e => {
        e.stopPropagation();
        if (item.children) {
          $('.cm-menu-item').not(el).removeClass('expanded');
          el.toggleClass('expanded');
        } else {
          switch (item.type) {
            case 'undo':
              this.handleUndo();
              break;
            case 'redo':
              this.handleRedo();
              break;
            case 'preview':
              this.handlePreview(el);
              break;
            case 'full-screen':
              this.handleFullScreen(el);
              break;
            case 'setting':
              this.handleSetting();
              break;
          }
        }
      });
      $(document).on('click', () => el.removeClass('expanded'));
      $('.cm-menu').append(el);
    })
  }

  /**
   * @description: Thanh Menu - Hoàn tác
   * @param {*}
   * @return {*}
   */
  handleUndo() {
    undo(this._cm);
    this.$focus();
  }

  /**
   * @description: Thanh menu - Làm lại
   * @param {*}
   * @return {*}
   */
  handleRedo() {
    redo(this._cm);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - In đậm
   * @param {*}
   * @return {*}
   */
  handleBold() {
    const cursor = this.$getCursor();
    const selectionText = this.$getSelection();
    this.$replaceSelection(` **${selectionText || ''}** `);
    if (selectionText === '') this.$setCursor(cursor + 5);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Nghiêng
   * @param {*}
   * @return {*}
   */
  handleItalic() {
    const cursor = this.$getCursor();
    const selectionText = this.$getSelection();
    this.$replaceSelection(` *${selectionText || ''}* `);
    if (selectionText === '') this.$setCursor(cursor + 4);
    this.$focus();
  }

  /**
   * @description: Thanh menu - xóa
   * @param {*}
   * @return {*}
   */
  handleLineThrough() {
    const cursor = this.$getCursor();
    const selectionText = this.$getSelection();
    this.$replaceSelection(` ~~${selectionText || ''}~~ `);
    if (selectionText === '') this.$setCursor(cursor + 5);
    this.$focus();
  }

  /**
   * @description: Thanh menu - Đánh dấu nội tuyến
   * @param {*}
   * @return {*}
   */
  handleInlineMarker() {
    const cursor = this.$getCursor();
    const selectionText = this.$getSelection();
    this.$replaceSelection(` \`${selectionText || ''}\` `);
    if (selectionText === '') this.$setCursor(cursor + 4);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Dải phân cách
   * @param {*}
   * @return {*}
   */
  handleSplitLine() {
    this.$replaceSelection(`${this.$getLineCh() ? '\n' : ''}\n------------\n`);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Blockquote
   * @param {*}
   * @return {*}
   */
  handleBlockQuotations() {
    const selection = this.$getSelection();
    if (selection === '') {
      this.$replaceSelection(`${this.$getLineCh() ? '\n' : ''}> Trích dẫn`);
    } else {
      const selectionText = selection.split('\n');
      for (let i = 0, len = selectionText.length; i < len; i++) {
        selectionText[i] = selectionText[i] === '' ? '' : '> ' + selectionText[i];
      }
      const str = (this.$getLineCh() ? '\n' : '') + selectionText.join('\n');
      this.$replaceSelection(str);
    }
    this.$focus();
  }

  /**
  * @description: Thanh Menu - Tiêu đề
  * @param {*}
  * @return {*}
  */
  handleTitle({ title, field }) {
    if (this.$getLineCh()) this.$replaceSelection('\n\n' + field + title);
    else this.$replaceSelection(field + title);
    this.$focus();
  }

  /**
  * @description: Thanh menu - Toàn màn hình
  * @param {*} el
  * @return {*}
  */
  handleFullScreen(el) {
    el.toggleClass('active');
    $('body').toggleClass('lock-scroll');
    $('.cm-container').toggleClass('fullscreen');
  }

  /**
   * @description: Thanh Menu - Xuất bản
   * @param {*}
   * @return {*}
   */
  handlePublish() {
    $('#btn-submit').click();
  }

  /**
   * @description: Thanh menu - Xóa màn hình
   * @param {*}
   * @return {*}
   */
  handleClean() {
    this._cm.dispatch({ changes: { from: 0, to: this._cm.state.doc.length, insert: '' } });
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Tải xuống
   * @param {*}
   * @return {*}
   */
  handleDownload() {
    const title = $('#title').val() || 'Bài viết mới';
    const aTag = document.createElement('a');
    let blob = new Blob([this._cm.state.doc.toString()]);
    aTag.download = title + '.md';
    aTag.href = URL.createObjectURL(blob);
    aTag.click();
    URL.revokeObjectURL(blob);
  }

  /**
   * @description: Thanh menu - Lưu bản nháp
   * @param {*}
   * @return {*}
   */
  handleDraft() {
    $('#btn-save').click();
  }

  /**
   * @description: Thanh Menu - thụt lề
   * @param {*}
   * @return {*}
   */
  handleIndent() {
    this.$replaceSelection('　');
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Danh sách theo thứ tự
   * @param {*}
   * @return {*}
   */
  handleOrderedList() {
    const selection = this.$getSelection();
    if (selection === '') {
      const str = (this.$getLineCh() ? '\n\n' : '') + '1. ';
      this.$replaceSelection(str);
    } else {
      const selectionText = selection.split('\n');
      for (let i = 0, len = selectionText.length; i < len; i++) {
        selectionText[i] = selectionText[i] === '' ? '' : i + 1 + '. ' + selectionText[i];
      }
      const str = (this.$getLineCh() ? '\n' : '') + selectionText.join('\n');
      this.$replaceSelection(str);
    }
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Danh sách không có thứ tự
   * @param {*}
   * @return {*}
   */
  handleUnorderedList() {
    const selection = this.$getSelection();
    if (selection === '') {
      const str = (this.$getLineCh() ? '\n' : '') + '- ';
      this.$replaceSelection(str);
    } else {
      const selectionText = selection.split('\n');
      for (let i = 0, len = selectionText.length; i < len; i++) {
        selectionText[i] = selectionText[i] === '' ? '' : '- ' + selectionText[i];
      }
      const str = (this.$getLineCh() ? '\n' : '') + selectionText.join('\n');
      this.$replaceSelection(str);
    }
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Xem trước
   * @param {*} el
   * @return {*}
   */
  handlePreview(el) {
    el.toggleClass('active');
    const { scrollDOM } = this._cm;
    const previewEl = $(".cm-preview")[0];

    if (el.hasClass('active')) {
      // Trước tiên hãy lấy vị trí cuộn của trình chỉnh sửa hiện tại
      const { scrollTop, scrollHeight, offsetHeight } = scrollDOM;
      const percentage = scrollTop / (scrollHeight - offsetHeight);

      // Hiển thị và ẩn bản xem trước và trình chỉnh sửa hoạt động
      $(".cm-editor").css("cssText", "display: none !important;");
      create(this._cm.state.doc.toString());
      $(".cm-preview").show();

      // Cuộn cửa sổ xem trước đến vị trí đã chỉ định
      previewEl.scrollTo({
        top: percentage * (previewEl.scrollHeight - previewEl.offsetHeight),
        behavior: "smooth"
      })
    } else {
      // Trước tiên hãy lấy vị trí cuộn của bản xem trước hiện tại
      const { scrollTop, scrollHeight, offsetHeight } = previewEl;
      const percentage = scrollTop / (scrollHeight - offsetHeight);

      $(".cm-preview").hide();
      $(".cm-editor").css("display", "");

      // Cuộn cửa sổ xem trước đến vị trí đã chỉ định
      scrollDOM.scrollTo({
        top: percentage * (scrollDOM.scrollHeight - scrollDOM.offsetHeight),
        behavior: "smooth"
      });

      this.$focus();
    }
  }

  /**
   * @description: Thanh Menu - Thời gian
   * @param {*}
   * @return {*}
   */
  handleTime() {
    const time = new Date();
    const _Year = time.getFullYear();
    const _Month = String(time.getMonth() + 1).padStart(2, 0);
    const _Date = String(time.getDate()).padStart(2, 0);
    const _Hours = String(time.getHours()).padStart(2, 0);
    const _Minutes = String(time.getMinutes()).padStart(2, 0);
    const _Seconds = String(time.getSeconds()).padStart(2, 0);
    const _Day = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][time.getDay()];
    const text = `${this.$getLineCh() ? '\n' : ''}${_Year}/${_Month}/${_Date} ${_Hours}:${_Minutes}:${_Seconds} ${_Day}\n`;
    this.$replaceSelection(text);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Siêu liên kết
   * @param {*}
   * @return {*}
   */
  handleLink() {
    this.$openModal({
      title: 'Liên kết',
      innerHtml: `
        <div class="fitem required">
          <label>Tiêu đề liên kết</label>
          <input type="text" autocomplete="off" name="title" placeholder="Vui lòng nhập tiêu đề liên kết"/>
        </div>
        <div class="fitem required">
          <label>Địa chỉ liên kết</label>
          <input type="text" autocomplete="off" name="url" placeholder="Vui lòng nhập địa chỉ liên kết"/>
        </div>
      `,
      confirm: () => {
        const title = $(`.cm-modal input[name="title"]`).val() || 'Ying';
        const url = $(`.cm-modal input[name="url"]`).val() || 'https://';
        this.$replaceSelection(` [${title}](${url}) `);
        this.$focus();
      }
    })
  }

  /**
   * @description: Thanh Menu - Hình ảnh
   * @param {*}
   * @return {*}
   */
  handlePicture() {
    this.$openModal({
      title: 'Hình ảnh cục bộ/mạng',
      innerHtml: `
        <div class="fitem required">
          <label>Tên hình ảnh</label>
          <input type="text" autocomplete="off" name="title" placeholder="Vui lòng nhập tên ảnh"/>
        </div>
        <div class="fitem required">
          <label>Địa chỉ hình ảnh</label>
          <input type="text" autocomplete="off" name="url" placeholder="Vui lòng nhập địa chỉ hình ảnh"/>
        </div>
      `,
      confirm: () => {
        const title = $(`.cm-modal input[name="title"]`).val() || 'Ying';
        const url = $(`.cm-modal input[name="url"]`).val() || 'https://';
        this.$replaceSelection(` ![${title}](${url}) `);
        this.$focus();
      }
    })
  }

  /**
   * @description: Menu Bar - Bảng
   * @param {*}
   * @return {*}
   */
  handleTable() {
    this.$openModal({
      title: 'Bảng',
      innerHtml: `
        <div class="fitem">
          <label>Hàng</label>
          <input type="text" style="width: 50px; flex: none; margin-right: 10px;" value="3" autocomplete="off" name="row"/>
          <label>Cột</label>
          <input type="text" style="width: 50px; flex: none;" value="3" autocomplete="off" name="column"/>
        </div>
      `,
      confirm: () => {
        let row = $(`.cm-modal input[name="row"]`).val();
        let column = $(`.cm-modal input[name="column"]`).val();
        if (isNaN(row)) row = 3;
        if (isNaN(column)) column = 3;
        let rowStr = '';
        let rangeStr = '';
        let columnlStr = '';
        for (let i = 0; i < column; i++) {
          rowStr += '| Tiêu đề ';
          rangeStr += '| :--: ';
        }
        for (let i = 0; i < row; i++) {
          for (let j = 0; j < column; j++) columnlStr += '| Nội dung ';
          columnlStr += '|\n';
        }
        const htmlStr = `${rowStr}|\n${rangeStr}|\n${columnlStr}\n`;
        if (this.$getLineCh()) this.$replaceSelection('\n\n' + htmlStr);
        else this.$replaceSelection(htmlStr);
        this.$focus();
      }
    })
  }

  /**
   * @description: Thanh menu - Khối mã
   * @param {*}
   * @return {*}
   */
  handleCodeBlock() {
    this.$openModal({
      title: 'Chèn khối mã',
      innerHtml: `
        <div class="fitem">
          <label>Loại ngôn ngữ</label>
          <select name="type">
            <option value="">- Vui lòng chọn loại ngôn ngữ -</option>
            ${languages}
          </select>
        </div>
      `,
      confirm: () => {
        const type = $(`.cm-modal select[name="type"]`).val();
        if (!type) return;
        const htmlStr = `\`\`\`${type}\nmã...\n\`\`\``;
        if (this.$getLineCh()) this.$replaceSelection('\n\n' + htmlStr);
        else this.$replaceSelection(htmlStr);
        this.$focus();
        sessionStorage.setItem('sessionStorageCode', type);
      },
      callback: () => {
        const sessionStorageCode = sessionStorage.getItem('sessionStorageCode');
        if (!sessionStorageCode) return;
        $(`.cm-modal select[name="type"] option[value="${sessionStorageCode}"]`).attr('selected', true);
      }
    })
  }

  /**
   * @description: Thanh Menu - HTML gốc
   * @param {*}
   * @return {*}
   */
  handleHtml() {
    const str = `${this.$getLineCh() ? '\n' : ''}!!!\n<div style="text-align: center;">Căn giữa</div>\n<div style="text-align: left;">Căn trái</div>\n<div style="text-align: right;">Căn phải</div>\n<font size="5" color="red">Màu đỏ</font>\n!!!\n`;
    this.$replaceSelection(str);
    this.$focus();
  }

  /**
   * @description: Thanh Menu - Ký hiệu Phông chữ
   * @param {*}
   * @return {*}
   */
  handleTypeface() {
    this.$createMenuModal(typeface, 'typeface', 'Ký tự đặt biệt', 'sessionStorageTypeface')
  }

  /**
   * @description: Thanh menu - biểu tượng cảm xúc
   * @param {*}
   * @return {*}
   */
  handleEmoji() {
    this.$createMenuModal(emoji, 'emoji', 'Emoji (yêu cầu hỗ trợ cơ sở dữ liệu）', 'sessionStorageEmoji');
  }

  /**
   * @description: Thanh Menu - Biểu tượng cảm xúc khác
   * @param {*}
   * @return {*}
   */
  handleEmotion() {
    this.$createMenuModal(emotion, 'emotion', 'Biểu tượng cảm xúc', 'sessionStorageEmotion');
  }

  /**
   * @description: Thanh Menu - Tải lên Tệp đính kèm
   * @param {*}
   * @return {*}
   */
  handleUpload() {
    this.$openModal({
      title: 'Tải lên tệp đính kèm',
      innerHtml: `
        <div class="upload_dragger">
          <div class="upload_dragger__icon"></div>
          <div class="upload_dragger__text">Kéo và thả tệp vào đây hoặc tải lên</div>
          <input class="upload_dragger__input" type="file" multiple />
        </div>
        <div class="upload_list"></div>
      `,
      confirm: () => {
        let str = '';
        $(".upload_list__item").each((index, item) => {
          // Nếu nó ở trạng thái không thành công hoặc quá trình tải lên không hoàn tất, không làm gì cả
          if (item.getAttribute("data-success") === "0" || !item.getAttribute("data-success")) return;
          str += `${item.getAttribute('data-isImage') === "true" ? "!" : ""}[${item.getAttribute('data-title')}](${item.getAttribute('data-url')})\n`;
        })
        this.$replaceSelection(this.$getLineCh() ? '\n' : '' + str);
        this.$focus();
      },
      callback: () => {
        $(`.cm-modal input[type="file"]`).on('change', e => {
          const files = Array.from(e.target.files);
          files.forEach(file => {
            const { type } = file;
            // Nếu không thể xác định loại tệp, không làm gì trực tiếp
            if (!type) return;
            // Nếu nó không phải là loại tệp hình ảnh, hãy gọi trực tiếp tải lên
            if (type.indexOf('image') === -1) return upload(file);
            // Nếu đó là một loại hình ảnh, hãy xử lý hình ảnh trước và tải nó lên sau khi xử lý
            compressImg(file).then(file => upload(file));
          });
        });
        $(`.cm-modal .upload_dragger__input`).on('dragenter', function () {
          $(`.cm-modal .upload_dragger`).addClass("drop");
        })
        $(`.cm-modal .upload_dragger__input`).on('dragleave drop', function () {
          $(`.cm-modal .upload_dragger`).removeClass("drop");
        })
      }
    })
  }

  /**
   * @description: Thanh Menu - Cài đặt
   * @param {*}
   * @return {*}
   */
  handleSetting() {
    this.$openModal({
      title: 'Thiết lập',
      hasFooter: false,
      innerHtml: `
        <div class="fitem">
          <label>Màu văn bản đóng dấu</label>
          <input name="watermarkColor" type="color" />
        </div>
        <div class="fitem">
          <label>Văn bản đóng dấu hình ảnh</label>
          <input name="watermarkText" type="text" placeholder="Vui lòng nhập văn bản đóng dấu" maxlength="8" />
        </div>
        <div class="fitem">
          <label>Vị trí văn bản đóng dấu</label>
          <select name="watermarkPosition">
            <option value="">- Vui lòng chọn một vị trí -</option>
            <option value="0">Trên cùng bên trái</option>
            <option value="1">Phía dưới bên trái</option>
            <option value="2">Trên cùng bên phải</option>
            <option value="3">Phía dưới bên phải</option>
          </select>
        </div>
        <div class="fitem">
          <label>Tỷ lệ nén hình ảnh</label>
          <select name="compressionRatio">
            <option value="">- Vui lòng chọn một tỷ lệ nén -</option>
            <option value="1">Không nén</option>
            <option value="0.9">Nén 10%</option>
            <option value="0.8">Nén 20%</option>
            <option value="0.7">Nén 30%</option>
            <option value="0.6">Nén 40%</option>
            <option value="0.5">Nén 50%</option>
            <option value="0.4">Nén 60%</option>
            <option value="0.3">Nén 70%</option>
            <option value="0.2">Nén 80%</option>
            <option value="0.1">Nén 90%</option>
          </select>
        </div>
      `,
      callback: () => {
        const watermarkColor = localStorage.getItem('watermarkColor');
        watermarkColor && $(`.cm-modal input[name="watermarkColor"]`).val(watermarkColor);

        const watermarkText = localStorage.getItem('watermarkText');
        watermarkText && $(`.cm-modal input[name="watermarkText"]`).val(watermarkText);

        const watermarkPosition = localStorage.getItem('watermarkPosition');
        watermarkPosition && $(`.cm-modal select[name="watermarkPosition"] option[value="${watermarkPosition}"]`).attr('selected', true);

        const compressionRatio = localStorage.getItem('compressionRatio');
        compressionRatio && $(`.cm-modal select[name="compressionRatio"] option[value="${compressionRatio}"]`).attr('selected', true);

        $(`.cm-modal input[name="watermarkColor"]`).on('change', function () {
          localStorage.setItem('watermarkColor', $(this).val());
        })

        $(`.cm-modal input[name="watermarkText"]`).on('change', function () {
          localStorage.setItem('watermarkText', $(this).val());
        })

        $(`.cm-modal select[name="watermarkPosition"]`).on('change', function () {
          localStorage.setItem('watermarkPosition', $(this).val());
        })

        $(`.cm-modal select[name="compressionRatio"]`).on('change', function () {
          localStorage.setItem('compressionRatio', $(this).val());
        })
      }
    })
  }

  /**
   * @description: Thanh Menu - Nhiệm vụ
   * @param {*} type điều kiện hoàn thành
   * @return {*}
   */
  handleTask(type) {
    this.$replaceSelection(` {${type ? '√' : '×'}} `);
    this.$focus();
  }
}