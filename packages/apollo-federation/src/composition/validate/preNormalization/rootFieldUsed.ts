import {
  GraphQLError,
  visit,
  OperationTypeNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
} from 'graphql';
import { ServiceDefinition, DefaultRootOperationTypeName } from '../../types';

import { logServiceAndType, errorWithCode } from '../../utils';

/**
 * - When a schema definition or extension is provided, warn user against using
 *    default root operation type names for types or extensions
 *    (Query, Mutation, Subscription)
 */
export const rootFieldUsed = ({
  name: serviceName,
  typeDefs,
}: ServiceDefinition) => {
  const errors: GraphQLError[] = [];

  // Map of OperationTypeNode to its respective default root operation type name
  const defaultRootOperationNameLookup: {
    [node in OperationTypeNode]: DefaultRootOperationTypeName
  } = {
    query: 'Query',
    mutation: 'Mutation',
    subscription: 'Subscription',
  };

  // Array of default root operation names
  const defaultRootOperationNames = Object.values(
    defaultRootOperationNameLookup,
  );

  const disallowedTypeNames: {
    [key in DefaultRootOperationTypeName]?: boolean
  } = {};

  let hasSchemaDefinitionOrExtension = false;
  visit(typeDefs, {
    OperationTypeDefinition(node) {
      // If we find at least one root operation type definition, we know the user has
      // specified either a schema definition or extension.
      hasSchemaDefinitionOrExtension = true;

      if (
        !defaultRootOperationNames.includes(node.type.name
          .value as DefaultRootOperationTypeName)
      ) {
        disallowedTypeNames[
          defaultRootOperationNameLookup[node.operation]
        ] = true;
      }
    },
  });

  console.log(disallowedTypeNames);

  // If a schema or schema extension is defined, we need to warn for all usages
  // of default root operation type names.
  if (hasSchemaDefinitionOrExtension) {
    visit(typeDefs, {
      ObjectTypeDefinition(node) {
        visitObjectOrExtensionType(node);
      },
      ObjectTypeExtension(node) {
        visitObjectOrExtensionType(node);
      },
    });

    function visitObjectOrExtensionType(
      node: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
    ) {
      if (
        disallowedTypeNames[node.name.value as DefaultRootOperationTypeName]
      ) {
        errors.push(
          errorWithCode(
            `ROOT_${node.name.value}_USED`,
            logServiceAndType(serviceName, node.name.value) +
              `Found invalid use of default root operation type \`${
                node.name.value
              }\`. Default root operation type names (${defaultRootOperationNames.join(
                ', ',
              )}) are disallowed when a schema is defined or extended within a service.`,
          ),
        );
      }
    }
  }

  return errors;
};
