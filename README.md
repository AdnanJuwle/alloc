# Expense Tracker - Goal-First Financial Planning

A desktop application for goal-first expense tracking and financial planning. Unlike traditional expense trackers that log past transactions, this app helps you plan for future goals and automatically allocate income to meet your targets.

## Features

### V1 - Core Features

1. **Goal Buckets**
   - Create multiple savings goals (e.g., Emergency Fund, Laptop Upgrade, Server Build)
   - Set target amounts, deadlines, and priority weights
   - Track progress and calculate required monthly contributions
   - Visual progress indicators

2. **Income Simulation Engine**
   - Create multiple salary scenarios (Conservative, Expected, Optimistic)
   - Configure tax rates and fixed expenses
   - See net allocatable cash for each scenario
   - Answer: "If I earn X, what must happen to my money every month?"

3. **Auto-Split Logic**
   - Automatically allocate income when it arrives
   - Emergency fund gets first priority (if configured)
   - High-priority goals get fixed amounts or percentages
   - Remaining money is free-spend (guilt-free)
   - Simulates real wealth management systems

### Planned Features (V2 & V3)

- **Future Pain Visualization**: Show consequences of missing contributions
- **Flex Events**: Handle unexpected expenses and rebalance goals
- **AI Financial Advisor**: Get advice on affordability and trade-offs
- **Behavioral Tracking**: Track why you override plans

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the main process:
```bash
npm run build:main
```

3. Run in development mode:
```bash
npm run dev
```

This will:
- Start the React development server on port 3000
- Launch the Electron app
- Watch for changes

## Building for Production

To create a distributable executable:

```bash
npm run build
```

This will:
1. Build the TypeScript main process
2. Build the React frontend
3. Package everything into an executable installer

**Windows**: Creates an unpacked executable in `release/win-unpacked/Expense Tracker.exe`. You can double-click this file to run the app directly - no installation needed!

**Note**: 
- You may see code signing errors during build - these can be ignored. The app will still be built successfully.
- In production builds, DevTools are disabled and the menu bar is hidden for a cleaner user experience.
- The executable is portable - you can copy the entire `win-unpacked` folder to another computer and it will work.

## Project Structure

```
expense/
├── main/                 # Electron main process
│   ├── main.ts          # Main entry point
│   ├── database.ts      # SQLite database setup
│   ├── ipc-handlers.ts  # IPC communication handlers
│   └── preload.ts       # Preload script for security
├── src/                  # React frontend
│   ├── components/      # React components
│   │   ├── Dashboard.tsx
│   │   ├── GoalBuckets.tsx
│   │   ├── IncomeSimulator.tsx
│   │   └── AutoSplit.tsx
│   ├── types.ts         # TypeScript type definitions
│   ├── utils/           # Utility functions
│   └── App.tsx          # Main React component
└── package.json
```

## Usage

1. **Create Goal Buckets**: Define your savings goals with target amounts and deadlines
2. **Set Up Income Scenarios**: Create different salary scenarios with taxes and fixed expenses
3. **Use Auto-Split**: Calculate how income should be allocated across your goals
4. **Monitor Progress**: Use the dashboard to track your progress and identify urgent goals

## Technology Stack

- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type safety
- **JSON file storage**: Simple, reliable local storage (no native dependencies)
- **Vite**: Build tool for React
- **Lucide React**: Icon library

## Database

The app uses JSON file storage to store data locally in your user data directory. No data is sent to external servers. The database file is stored as `expense-tracker.json` in your Electron user data directory.

## License

MIT

