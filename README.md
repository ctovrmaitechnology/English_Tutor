

////////////////////////////////////////

```bash
# Generate a new migration (after adding/changing an entity)
npm run migration:generate

# Migrations run automatically on npm run start:dev
# Manual run if needed
npm run migration:run

# Revert last migration
npm run migration:revert
```


////////////

## Project Structure

```
src/
├── database/
│   └── migrations/        # Auto-generated migration files
├── modules/
│   ├── auth/              # Authentication (register, login)
│   └── users/             # Users module
├── app.module.ts
├── main.ts
└── data-source.ts         # TypeORM CLI data source config
```



## Setup

```bash
```
# Install dependencies
npm install

npm run build

npm run migration:generate 
```
```npm run migration:generate -- src/database/migrations/CreateUsersTable // for our own migration name


npm run migration:run

npm run start:dev
```