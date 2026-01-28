import Header from "./Header";
import Messages from "./Messages";
import InputBox from "./InputBox";

export default function ChatWindow({ currentChat }) {
    if (!currentChat) {
        return <div className="chatEmpty">Select a chat</div>;
    }

    return (
        <div className="chatWindow">
            <Header />
            <Messages chat={currentChat} />
            <InputBox chat={currentChat} />
        </div>
    );
}
