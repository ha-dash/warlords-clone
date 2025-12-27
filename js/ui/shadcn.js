/**
 * Shadcn UI Components - Vanilla JavaScript Implementation
 * Provides shadcn/ui styled components without React dependency
 */

/**
 * Utility function to merge class names (simplified version)
 */
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

/**
 * Button Component
 */
export class Button {
    constructor(options = {}) {
        this.variant = options.variant || 'default';
        this.size = options.size || 'default';
        this.className = options.className || '';
        this.disabled = options.disabled || false;
        this.onClick = options.onClick || null;
        this.children = options.children || '';
        this.icon = options.icon || null;
    }

    render() {
        const button = document.createElement('button');
        
        const variants = {
            default: 'btn btn-default',
            destructive: 'btn btn-destructive',
            outline: 'btn btn-outline',
            secondary: 'btn btn-secondary',
            ghost: 'btn btn-ghost',
            link: 'btn btn-link'
        };

        const sizes = {
            default: '',
            sm: 'btn-sm',
            lg: 'btn-lg',
            icon: 'btn-icon'
        };

        button.className = cn(
            variants[this.variant] || variants.default,
            sizes[this.size] || sizes.default,
            this.className
        );

        if (this.disabled) {
            button.disabled = true;
        }

        if (this.onClick) {
            button.addEventListener('click', this.onClick);
        }

        if (this.icon) {
            const iconEl = typeof this.icon === 'string' 
                ? document.createTextNode(this.icon)
                : this.icon;
            button.appendChild(iconEl);
        }

        if (this.children) {
            if (typeof this.children === 'string') {
                button.appendChild(document.createTextNode(this.children));
            } else {
                button.appendChild(this.children);
            }
        }

        return button;
    }

    static create(options) {
        const btn = new Button(options);
        return btn.render();
    }
}

/**
 * Card Component
 */
export class Card {
    constructor(options = {}) {
        this.className = options.className || '';
        this.children = options.children || [];
    }

    render() {
        const card = document.createElement('div');
        card.className = cn('card', this.className);

        if (Array.isArray(this.children)) {
            this.children.forEach(child => {
                if (typeof child === 'string') {
                    card.appendChild(document.createTextNode(child));
                } else {
                    card.appendChild(child);
                }
            });
        }

        return card;
    }

    static Header({ title, description, className = '' }) {
        const header = document.createElement('div');
        header.className = cn('card-header', className);

        if (title) {
            const titleEl = document.createElement('h3');
            titleEl.className = 'card-title';
            titleEl.textContent = title;
            header.appendChild(titleEl);
        }

        if (description) {
            const descEl = document.createElement('p');
            descEl.className = 'card-description';
            descEl.textContent = description;
            header.appendChild(descEl);
        }

        return header;
    }

    static Content({ children, className = '' }) {
        const content = document.createElement('div');
        content.className = cn('card-content', className);
        
        if (typeof children === 'string') {
            content.textContent = children;
        } else {
            content.appendChild(children);
        }

        return content;
    }

    static Footer({ children, className = '' }) {
        const footer = document.createElement('div');
        footer.className = cn('card-footer', className);
        
        if (typeof children === 'string') {
            footer.textContent = children;
        } else {
            footer.appendChild(children);
        }

        return footer;
    }

    static create(options) {
        const card = new Card(options);
        return card.render();
    }
}

/**
 * Dialog Component
 */
export class Dialog {
    constructor(options = {}) {
        this.title = options.title || '';
        this.description = options.description || '';
        this.children = options.children || null;
        this.onClose = options.onClose || null;
        this.open = options.open || false;
    }

    render() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.dataset.state = this.open ? 'open' : 'closed';

        const content = document.createElement('div');
        content.className = 'dialog-content';
        content.dataset.state = this.open ? 'open' : 'closed';

        const header = document.createElement('div');
        header.className = 'dialog-header';

        if (this.title) {
            const titleEl = document.createElement('h2');
            titleEl.className = 'dialog-title';
            titleEl.textContent = this.title;
            header.appendChild(titleEl);
        }

        if (this.description) {
            const descEl = document.createElement('p');
            descEl.className = 'dialog-description';
            descEl.textContent = this.description;
            header.appendChild(descEl);
        }

        content.appendChild(header);

        if (this.children) {
            const body = document.createElement('div');
            if (typeof this.children === 'string') {
                body.textContent = this.children;
            } else {
                body.appendChild(this.children);
            }
            content.appendChild(body);
        }

        overlay.appendChild(content);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && this.onClose) {
                this.onClose();
            }
        });

        return overlay;
    }

    show() {
        const dialog = this.render();
        document.body.appendChild(dialog);
        requestAnimationFrame(() => {
            dialog.dataset.state = 'open';
        });
        return dialog;
    }

    hide(dialog) {
        if (dialog) {
            dialog.dataset.state = 'closed';
            setTimeout(() => {
                if (dialog.parentNode) {
                    dialog.parentNode.removeChild(dialog);
                }
            }, 200);
        }
    }

    static create(options) {
        const dialog = new Dialog(options);
        return dialog.show();
    }
}

/**
 * Input Component
 */
export class Input {
    constructor(options = {}) {
        this.type = options.type || 'text';
        this.placeholder = options.placeholder || '';
        this.value = options.value || '';
        this.className = options.className || '';
        this.onChange = options.onChange || null;
        this.disabled = options.disabled || false;
    }

    render() {
        const input = document.createElement('input');
        input.type = this.type;
        input.className = cn('input', this.className);
        input.placeholder = this.placeholder;
        input.value = this.value;
        input.disabled = this.disabled;

        if (this.onChange) {
            input.addEventListener('input', (e) => this.onChange(e.target.value));
        }

        return input;
    }

    static create(options) {
        const input = new Input(options);
        return input.render();
    }
}

/**
 * Badge Component
 */
export class Badge {
    constructor(options = {}) {
        this.variant = options.variant || 'default';
        this.className = options.className || '';
        this.children = options.children || '';
    }

    render() {
        const badge = document.createElement('span');
        
        const variants = {
            default: 'badge badge-default',
            secondary: 'badge badge-secondary',
            destructive: 'badge badge-destructive',
            outline: 'badge badge-outline'
        };

        badge.className = cn(variants[this.variant] || variants.default, this.className);

        if (typeof this.children === 'string') {
            badge.textContent = this.children;
        } else {
            badge.appendChild(this.children);
        }

        return badge;
    }

    static create(options) {
        const badge = new Badge(options);
        return badge.render();
    }
}

/**
 * Alert Component
 */
export class Alert {
    constructor(options = {}) {
        this.variant = options.variant || 'default';
        this.title = options.title || '';
        this.description = options.description || '';
        this.className = options.className || '';
    }

    render() {
        const alert = document.createElement('div');
        
        const variants = {
            default: 'alert',
            destructive: 'alert alert-destructive'
        };

        alert.className = cn(variants[this.variant] || variants.default, this.className);

        if (this.title) {
            const titleEl = document.createElement('h5');
            titleEl.className = 'alert-title';
            titleEl.textContent = this.title;
            alert.appendChild(titleEl);
        }

        if (this.description) {
            const descEl = document.createElement('div');
            descEl.className = 'alert-description';
            descEl.textContent = this.description;
            alert.appendChild(descEl);
        }

        return alert;
    }

    static create(options) {
        const alert = new Alert(options);
        return alert.render();
    }
}

// Export all components
export default {
    Button,
    Card,
    Dialog,
    Input,
    Badge,
    Alert,
    cn
};

