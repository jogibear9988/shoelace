import { Component, Event, EventEmitter, Method, h } from '@stencil/core';
import { scrollIntoView } from '../../utilities/scroll';
import { getTextContent } from '../../utilities/slot';

/**
 * @since 1.0
 * @status stable
 *
 * @slot - The menu's items.
 */

@Component({
  tag: 'sl-menu',
  styleUrl: 'menu.scss',
  shadow: true
})
export class Menu {
  constructor() {
    this.handleBlur = this.handleBlur.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleMouseOver = this.handleMouseOver.bind(this);
    this.handleMouseOut = this.handleMouseOut.bind(this);
  }

  ignoreMouseEvents = false;
  ignoreMouseTimeout: any;
  menu: HTMLElement;
  typeToSelect = '';
  typeToSelectTimeout: any;

  /** Emitted when the menu gains focus. */
  @Event() slFocus: EventEmitter;

  /** Emitted when the menu loses focus. */
  @Event() slBlur: EventEmitter;

  /** Emitted when a menu item is selected. */
  @Event() slSelect: EventEmitter;

  /** Sets focus on the menu. */
  @Method()
  async setFocus() {
    this.menu.focus();
  }

  /** Removes focus from the menu. */
  @Method()
  async removeFocus() {
    this.menu.blur();
  }

  getItems() {
    const slot = this.menu.querySelector('slot');
    return [...slot.assignedElements({ flatten: true })].filter(
      (el: any) => el.tagName.toLowerCase() === 'sl-menu-item' && !el.disabled
    ) as [HTMLSlMenuItemElement];
  }

  getActiveItem() {
    return this.getItems().find(i => i.active);
  }

  setActiveItem(item?: HTMLSlMenuItemElement) {
    this.getItems().map(i => (i.active = i === item));
  }

  scrollItemIntoView(item: HTMLSlMenuItemElement) {
    if (item) {
      scrollIntoView(item, this.menu);
    }
  }

  handleFocus() {
    const item = this.getActiveItem();
    if (!item) {
      this.setActiveItem(this.getItems()[0]);
    }
    this.slFocus.emit();
  }

  handleBlur() {
    this.setActiveItem();
    this.slBlur.emit();
  }

  handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const item = target.closest('sl-menu-item');

    if (item && !item.disabled) {
      this.slSelect.emit({ item });
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    // When keying through the menu, if the mouse happens to be hovering over a menu item and the menu scrolls, the
    // mouseout/mouseover event will fire causing the selection to be different than what the user expects. This gives
    // us a way to temporarily ignore mouse events while the user is interacting with a keyboard.
    clearTimeout(this.ignoreMouseTimeout);
    this.ignoreMouseTimeout = setTimeout(() => (this.ignoreMouseEvents = false), 500);
    this.ignoreMouseEvents = true;

    // Make a selection when pressing enter
    if (event.key === 'Enter') {
      const item = this.getActiveItem();
      event.preventDefault();

      if (item) {
        this.slSelect.emit({ item });
      }
    }

    // Prevent scrolling when space is pressed
    if (event.key === ' ') {
      event.preventDefault();
    }

    // Move the selection when pressing down or up
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      const items = this.getItems();
      const selectedItem = this.getActiveItem();
      let index = items.indexOf(selectedItem);

      if (items.length) {
        event.preventDefault();

        if (event.key === 'ArrowDown') {
          index++;
        } else if (event.key === 'ArrowUp') {
          index--;
        } else if (event.key === 'Home') {
          index = 0;
        } else if (event.key === 'End') {
          index = items.length - 1;
        }

        if (index < 0) index = items.length - 1;
        if (index > items.length - 1) index = 0;

        this.setActiveItem(items[index]);
        this.scrollItemIntoView(items[index]);

        return;
      }
    }

    // Handle type-to-search behavior when non-control characters are entered
    if (event.key === ' ' || /^[\d\w]$/i.test(event.key)) {
      clearTimeout(this.typeToSelectTimeout);
      this.typeToSelectTimeout = setTimeout(() => (this.typeToSelect = ''), 750);
      this.typeToSelect += event.key;

      const items = this.getItems();
      for (const item of items) {
        const slot = item.shadowRoot.querySelector('slot:not([name])') as HTMLSlotElement;
        const label = getTextContent(slot).toLowerCase().trim();
        if (label.substring(0, this.typeToSelect.length) === this.typeToSelect) {
          items.map(i => (i.active = i === item));
          break;
        }
      }
    }
  }

  handleMouseOver(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const item = target.closest('sl-menu-item');

    if (item && !this.ignoreMouseEvents) {
      this.setActiveItem(item);
    }
  }

  handleMouseOut(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const item = target.closest('sl-menu-item');

    if (item && !this.ignoreMouseEvents) {
      this.setActiveItem(null);
    }
  }

  render() {
    return (
      <div
        ref={el => (this.menu = el)}
        class="menu"
        tabIndex={0}
        role="menu"
        onClick={this.handleClick}
        onFocus={this.handleFocus}
        onBlur={this.handleBlur}
        onKeyDown={this.handleKeyDown}
        onMouseOver={this.handleMouseOver}
        onMouseOut={this.handleMouseOut}
      >
        <slot />
      </div>
    );
  }
}
