import { IoTDataPlaneClient} from "@aws-sdk/client-iot-data-plane";

const iotClient = new IoTDataPlaneClient();
export { iotClient };