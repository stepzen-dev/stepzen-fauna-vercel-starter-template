import fs from 'fs/promises';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { execSync } from 'child_process';

dotenv.config();

function loginStepZen() {
  try {
    if (!process.env.STEPZEN_ACCOUNT) {
      throw new Error('Environment variable STEPZEN_ACCOUNT is not set');
    }

    if (!process.env.STEPZEN_ADMIN_KEY) {
      throw new Error('Environment variable STEPZEN_ADMIN_KEY is not set');
    }

    const response = execSync(
      `stepzen login --account=${process.env.STEPZEN_ACCOUNT} --adminkey=${process.env.STEPZEN_ADMIN_KEY}`,
      {
        encoding: 'utf8',
      },
    ).toString();

    return {
      result: response,
    };
  } catch (error) {
    return { error: error.message };
  }
}

const copyStepZenEnv = async () => {
  if (
    process.env.STEPZEN_FAUNA_GRAPHQL_DOMAIN &&
    process.env.STEPZEN_FAUNA_DB_DOMAIN &&
    process.env.STEPZEN_FAUNA_ADMIN_KEY
  ) {
    return {
      result: 'Fauna credentials already set',
    };
  }

  // Append the Fauna DB domain and admin key to the `.env` file prefixed with `STEPZEN_` to make them available to the StepZen `config.yaml` file.
  try {
    if (!process.env.FAUNA_DB_DOMAIN) {
      throw new Error('Environment variable FAUNA_DB_DOMAIN is not set');
    }

    if (!process.env.FAUNA_ADMIN_KEY) {
      throw new Error('Environment variable FAUNA_ADMIN_KEY is not set');
    }

    const FAUNA_GRAPHQL_DOMAIN = process.env.FAUNA_DB_DOMAIN.replace(
      'db',
      'graphql',
    );

    const result = await fs.appendFile(
      './.env',
      `\nSTEPZEN_FAUNA_GRAPHQL_DOMAIN=${FAUNA_GRAPHQL_DOMAIN}\nSTEPZEN_FAUNA_DB_DOMAIN=${process.env.FAUNA_DB_DOMAIN}\nSTEPZEN_FAUNA_ADMIN_KEY=${process.env.FAUNA_ADMIN_KEY}`,
    );

    return {
      result,
    };
  } catch (error) {
    console.log(error);
  }
};

const deployStepZenEndpoint = async () => {
  try {
    const response = execSync(`stepzen deploy --dir=./stepzen`, {
      encoding: 'utf8',
    }).toString();

    return {
      result: response,
    };
  } catch (error) {
    return {
      error: error.message,
    };
  }
};

const seedFaunaDatabase = async () => {
  try {
    const data = await fs.readFile('./scripts/seed.graphql', {
      encoding: 'utf8',
    });

    return await fetch(
      `https://${process.env.STEPZEN_FAUNA_GRAPHQL_DOMAIN}/import`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.FAUNA_ADMIN_KEY}`,
        },
        body: data,
      },
    ).then((result) => result.ok);
  } catch (error) {
    return false;
  }
};

async function setup() {
  const databaseSeeded = await seedFaunaDatabase();

  if (!databaseSeeded) {
    console.error('Fauna database could not be seeded');
    return;
  }

  const isLoggedIn = loginStepZen();

  if (!isLoggedIn) {
    console.error('StepZen could not be logged in');
    return;
  }

  const copyEnv = await copyStepZenEnv();

  if (!copyEnv) {
    console.error('StepZen could not copy the Fauna credentials');
    return;
  }

  const deployEndpoint = await deployStepZenEndpoint();

  if (!deployEndpoint) {
    console.error('StepZen could not deploy the endpoint');
    return;
  }

  console.log('Success');
}

setup();
