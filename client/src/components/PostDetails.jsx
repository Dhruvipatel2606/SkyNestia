import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../api";
import Post from "./Post/Post";

const PostDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const res = await API.get(`/post/${id}`);
                setPost(res.data);
            } catch (err) {
                console.error("Failed to fetch post", err);
                setError("Post not found");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [id]);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>{error}</div>;

    return (
        <div style={{ maxWidth: '600px', margin: '20px auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#666' }}>
                &#8592; Back
            </button>
            {post && <Post post={post} />}
        </div>
    );
};

export default PostDetails;
