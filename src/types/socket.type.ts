export interface ServerToClientEvents {
  receive_message: (data: {
    senderId: string;
    message: string;
    timestamp: Date;
  }) => void;
  new_notification: (message: string) => void;
}

export interface ClientToServerEvents {
  join_course: (courseId: string) => void;
  send_message: (data: {
    courseId: string;
    message: string;
    senderId: string;
  }) => void;
}

export interface InterServerEvents {}
export interface SocketData {
  userId: string;
}
