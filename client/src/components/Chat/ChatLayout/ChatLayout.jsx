import ChatList from "./ChatList/ChatList";
import ChatWindow from "./ChatWindow/ChatWindow";
import Side from "./Side/Side";

export default function ChatLayout({ currentChat, setCurrentChat }) {
    return (
        <div className="chatLayout">
            <Side />
            <ChatList setCurrentChat={setCurrentChat} />
            <ChatWindow currentChat={currentChat} />
        </div>
    );
}
