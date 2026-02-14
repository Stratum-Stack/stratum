export const START_TEXT = (args: {
  currentLimit: number,
  subscribeBonusLimit: number,
  orderBonusLimit: number
}) => `
🤝 Вас приветствует Smart Build – ваш эксперт по малоэтажному строительству в СПб!

✨ Здесь за 2 минуты вы можете:
• Сгенерировать 3D планировку вашего будущего дома по простому рисунку
• Получить смету на строительство под ваш проект

📱 *У вас ${args.currentLimit} бесплатная генерация. +${args.subscribeBonusLimit} – за подписку на канал! +${args.orderBonusLimit} – если оставите заявку менеджеру*
`

export const ALREADY_REGISTERED_TEXT = (args: { currentLimit: number }) => `
🤝 Вас приветствует Smart Build – ваш эксперт по малоэтажному строительству в СПб!

📱 *У вас осталось генераций: ${args.currentLimit}*
`
