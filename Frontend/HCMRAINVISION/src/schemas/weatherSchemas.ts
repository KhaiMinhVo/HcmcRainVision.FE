/**
 * JSON Schemas for weather API request validation
 */
export const reportSchema = {
  type: 'object',
  required: ['CameraId', 'IsRaining'],
  properties: {
    CameraId: { type: 'string', minLength: 1 },
    IsRaining: { type: 'boolean' },
    Note: { type: ['string', 'null'] },
  },
  additionalProperties: false,
} as const;

export const checkRouteSchema = {
  type: 'object',
  required: ['OriginLatitude', 'OriginLongitude', 'DestinationLatitude', 'DestinationLongitude', 'RoutePoints'],
  properties: {
    OriginLatitude: { type: 'number', minimum: -90, maximum: 90 },
    OriginLongitude: { type: 'number', minimum: -180, maximum: 180 },
    DestinationLatitude: { type: 'number', minimum: -90, maximum: 90 },
    DestinationLongitude: { type: 'number', minimum: -180, maximum: 180 },
    RoutePoints: {
      type: 'array',
      items: {
        type: 'object',
        required: ['Lat', 'Lng'],
        properties: {
          Lat: { type: 'number' },
          Lng: { type: 'number' },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
} as const;
