import {
  SSMClient,
  SendCommandCommand,
  GetCommandInvocationCommand,
  GetCommandInvocationCommandOutput,
} from "@aws-sdk/client-ssm";
import {
  AutoScalingClient,
  CompleteLifecycleActionCommand,
} from "@aws-sdk/client-auto-scaling";

export const handleLifecycleCreate = async ({
  instanceId,
  lifecycleHookName,
  autoScalingGroupName,
  token,
  documentName,
  timeout = 300,
}: {
  instanceId: string;
  lifecycleHookName: string;
  autoScalingGroupName: string;
  token: string;
  documentName: string;
  timeout?: number;
}) => {
  const ssmClient = new SSMClient({});
  const asgClient = new AutoScalingClient({});

  const timeoutAt = Date.now() + timeout * 1000;
  try {
    // Send the command to run the bitcoind check
    let commandId: string;
    let commandResult: GetCommandInvocationCommandOutput;
    while (
      typeof commandId === "undefined" ||
      commandResult?.Status !== "Success"
    ) {
      try {
        const command = new SendCommandCommand({
          InstanceIds: [instanceId],
          DocumentName: documentName,
          Comment: "bitcoind health check",
          TimeoutSeconds: Math.max((timeoutAt - Date.now()) / 1000 - 5, 30),
        });

        const commandResponse = await ssmClient.send(command);
        commandId = commandResponse.Command.CommandId;
      } catch (error) {
        console.warn("Error sending command:", error);
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
        continue;
      }

      // Wait for the command to complete and get the result
      do {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
        try {
          commandResult = await ssmClient.send(
            new GetCommandInvocationCommand({
              CommandId: commandId,
              InstanceId: instanceId,
            }),
          );
        } catch (error) {
          // If the instance hasn't started yet, GetCommandInvocation will throw an error
          console.warn("Error getting command invocation:", error);
        }
      } while (
        (typeof commandResult === "undefined" ||
          commandResult.Status === "InProgress" ||
          commandResult.Status === "Pending") &&
        Date.now() < timeoutAt
      );

      // Determine if the command was successful
      if (commandResult?.Status === "Success") {
        console.log("Command succeeded:", commandResult);
        // Notify ASG to continue the lifecycle action
        const lifecycleAction = new CompleteLifecycleActionCommand({
          AutoScalingGroupName: autoScalingGroupName,
          LifecycleActionResult: "CONTINUE",
          LifecycleHookName: lifecycleHookName,
          InstanceId: instanceId,
          LifecycleActionToken: token,
        });
        await asgClient.send(lifecycleAction);
        break;
      } else if (Date.now() > timeoutAt) {
        console.warn("Command timed out:", commandResult);
        // Notify ASG to abandon the lifecycle action
        const lifecycleAction = new CompleteLifecycleActionCommand({
          AutoScalingGroupName: autoScalingGroupName,
          LifecycleActionResult: "ABANDON",
          LifecycleHookName: lifecycleHookName,
          InstanceId: instanceId,
          LifecycleActionToken: token,
        });
        await asgClient.send(lifecycleAction);
        break;
      }
    }
  } catch (error) {
    console.error("Error handling lifecycle hook:", error);
    throw error;
  }
};
