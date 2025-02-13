import { composeServices } from './compose';
import {
  validateComposedSchema,
  validateServicesBeforeComposition,
} from './validate';
import { ServiceDefinition } from './types';
import { normalizeTypeDefs } from './normalize';

export function composeAndValidate(serviceList: ServiceDefinition[]) {
  const normalizedServiceList = serviceList.map(({ name, typeDefs }) => ({
    name,
    typeDefs: normalizeTypeDefs(typeDefs),
  }));

  // generate errors or warnings of the individual services
  const errors = validateServicesBeforeComposition(normalizedServiceList);

  // generate a schema and any errors or warnings
  const compositionResult = composeServices(normalizedServiceList);
  errors.push(...compositionResult.errors);

  // validate the composed schema based on service information
  errors.push(...validateComposedSchema(compositionResult.schema));

  // TODO remove the warnings array once no longer used by clients
  return { schema: compositionResult.schema, warnings: [], errors };
}
