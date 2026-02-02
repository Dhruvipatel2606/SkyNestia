import Header from "./Header.jsx";
import Messages from "./Messages.jsx";
import InputBox from "./InputBox.jsx";

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
