# Expenza
Expenza is a sleek, client-side **expense and investment tracker** built with plain HTML, CSS, and JavaScript. It combines day-to-day transaction management, budget planning, spending analytics, and manual precious-metal tracking in a single dashboard.
## Features
- **Dashboard overview** with key financial summaries
- **Expense tracking** with category, payment method, notes, and date
- **Income entries** through a dedicated quick-add flow
- **Analytics views** powered by Chart.js visualizations
- **Budget planning** with category-level monthly limits
- **Investment section** (currently marked as in development)
- **Local-first persistence** using browser `localStorage`
- **Manual gold/silver rate settings** saved per browser
## Tech Stack
- HTML5
- CSS3
- Vanilla JavaScript (no framework)
- [Chart.js](https://www.chartjs.org/) via CDN
- [CryptoJS](https://cryptojs.gitbook.io/docs/) via CDN
## Project Structure
```text
.
├── index.html      # App layout and page sections
├── style.css       # Visual design and responsive styles
├── app.js          # State, business logic, rendering, and interactions
├── assets/         # Icons and static assets
└── LICENSE
```
## Getting Started
1. Clone this repository.
2. Open the project folder.
3. Launch `index.html` in your browser.
No build step or package installation is required.
## Data Storage
Expenza stores app data in your browser via `localStorage`, including:
- Expense and income entries
- Budget configuration
- Investment records
- User settings and manual metal rates
Because storage is local to your browser profile, your data is not automatically synced across devices.
## Notes
- This repository currently ships as a **static frontend app**.
- Some UI text indicates future enhancements for investments and broader ecosystem features.
## License
This project is licensed under the terms in the [LICENSE](LICENSE) file.
