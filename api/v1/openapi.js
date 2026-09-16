import { cors } from '../../lib/api-money.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({
    openapi: '3.0.3',
    info: {
      title: 'T3x Shift API',
      version: '1.0.0',
      description: 'MT ECO SYSTEM. Developed by Futuret3ch, T3x and MemeTorrent. Compute combined Uber, Dasher, and Hello Panda trip math. Trip history lives on the driver’s iPhone; this API is stateless.'
    },
    paths: {
      '/api/health': { get: { summary: 'Health check' } },
      '/api/v1/platforms': { get: { summary: 'Supported platforms' } },
      '/api/v1/preview': {
        post: {
          summary: 'Enrich one trip with IRS mileage deduction and hourly rate',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    platform: { type: 'string', enum: ['uber', 'dasher', 'panda'] },
                    fare: { type: 'number' },
                    tip: { type: 'number' },
                    miles: { type: 'number' },
                    minutes: { type: 'number' },
                    occurredAt: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          }
        }
      },
      '/api/v1/summary': {
        post: {
          summary: 'Summarize an array of trips and expenses'
        }
      }
    }
  });
}
