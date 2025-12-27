/**
 * Пример использования shadcn компонентов в проекте
 * Демонстрация интеграции shadcn/ui стилей с vanilla JavaScript
 */

import { Button, Card, Dialog, Input, Badge, Alert } from './shadcn.js';

/**
 * Пример создания кнопки
 */
export function createShadcnButton() {
    return Button.create({
        variant: 'default',
        size: 'default',
        children: 'Кнопка',
        onClick: () => console.log('Кнопка нажата')
    });
}

/**
 * Пример создания карточки
 */
export function createShadcnCard() {
    const cardHeader = Card.Header({
        title: 'Заголовок карточки',
        description: 'Описание карточки'
    });

    const cardContent = Card.Content({
        children: 'Содержимое карточки'
    });

    const cardFooter = Card.Footer({
        children: Button.create({
            variant: 'default',
            children: 'Действие'
        })
    });

    return Card.create({
        children: [cardHeader, cardContent, cardFooter]
    });
}

/**
 * Пример создания диалога
 */
export function showShadcnDialog() {
    const dialog = Dialog.create({
        title: 'Диалоговое окно',
        description: 'Это пример диалога shadcn/ui',
        children: 'Содержимое диалога',
        onClose: () => console.log('Диалог закрыт')
    });

    // Автоматически закрывается через 3 секунды для примера
    setTimeout(() => {
        new Dialog().hide(dialog);
    }, 3000);
}

/**
 * Пример создания формы с shadcn компонентами
 */
export function createShadcnForm(container) {
    const card = Card.create({
        className: 'max-w-md mx-auto mt-4'
    });

    const header = Card.Header({
        title: 'Настройки игры',
        description: 'Измените параметры игры'
    });

    const content = Card.Content({
        className: 'space-y-4'
    });

    // Создаем поля ввода
    const nameInput = Input.create({
        type: 'text',
        placeholder: 'Имя игрока',
        onChange: (value) => console.log('Имя:', value)
    });

    const emailInput = Input.create({
        type: 'email',
        placeholder: 'Email',
        onChange: (value) => console.log('Email:', value)
    });

    // Создаем кнопки
    const submitBtn = Button.create({
        variant: 'default',
        children: 'Сохранить',
        onClick: () => console.log('Сохранено')
    });

    const cancelBtn = Button.create({
        variant: 'outline',
        children: 'Отмена',
        onClick: () => console.log('Отменено')
    });

    const footer = Card.Footer({
        children: [cancelBtn, submitBtn]
    });

    content.appendChild(nameInput);
    content.appendChild(emailInput);

    card.appendChild(header);
    card.appendChild(content);
    card.appendChild(footer);

    if (container) {
        container.appendChild(card);
    }

    return card;
}

