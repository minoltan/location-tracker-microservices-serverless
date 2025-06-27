import { ApiGatewayManagementApiClient } from "@aws-sdk/client-apigatewaymanagementapi";

const webSocketClient = (event) => {
    const { domainName, stage } = event.requestContext;
    return new ApiGatewayManagementApiClient({
        endpoint: `https://${domainName}/${stage}`
    });
};

export { webSocketClient };