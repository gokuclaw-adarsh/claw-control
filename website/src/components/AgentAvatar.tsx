import { Facehash } from "facehash";

interface AgentAvatarProps {
  name: string;
  size?: number;
  enableBlink?: boolean;
}

export function AgentAvatar({ name, size = 32, enableBlink = true }: AgentAvatarProps) {
  return (
    <Facehash 
      name={name} 
      size={size} 
      intensity3d="dramatic"
      enableBlink={enableBlink}
    />
  );
}
