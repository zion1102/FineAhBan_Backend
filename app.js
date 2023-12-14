const express = require('express');
const cors = require('cors');
const { pool, testDBConnection } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

testDBConnection();

app.get('/api/posts', async (req, res) => {
    try {
        const allPosts = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
        res.json(allPosts.rows);
    } catch (err) {
        console.error(err.message);
    }
});

app.post('/api/social-login', async (req, res) => {
    let {
        email, firstName, lastName, avatar, socialId, provider, city, country, state, zip
    } = req.body;

    // Validate and truncate data if necessary
    email = email.slice(0, 255);
    firstName = firstName.slice(0, 255);
    lastName = lastName.slice(0, 255);
    avatar = avatar.slice(0, 255);
    socialId = socialId.slice(0, 255);
    city = city ? city.slice(0, 255) : city;
    country = country ? country.slice(0, 255) : country;
    state = state ? state.slice(0, 255) : state;
    zip = zip ? zip.slice(0, 255) : zip;

    try {
        let user;
        let query;

        if (provider === 'facebook') {
            query = 'SELECT * FROM users WHERE facebook_uid = $1';
        } else if (provider === 'google') {
            query = 'SELECT * FROM users WHERE google_oauth2_uid= $1';
        } else {
            return res.status(400).send('Invalid provider');
        }

        user = await pool.query(query, [socialId]);

        if (user.rows.length > 0) {
            // Update user if they already exist
            user = await pool.query(
                `UPDATE users SET
                first_name = $2,
                last_name = $3,
                avatar = $4,
                facebook_uid = CASE WHEN $5 = 'facebook' THEN $6 ELSE facebook_uid END,
                google_oauth2_uid = CASE WHEN $5 = 'google' THEN $6 ELSE google_oauth2_uid END,
                city = $7,
                country = $8,
                state = $9,
                zip = $10,
                updated_at = NOW() 
                WHERE email = $1 RETURNING *`,
                [email, firstName, lastName, avatar, provider, socialId, city, country, state, zip]
            );
        } else {
            // Insert new user if they do not exist
            user = await pool.query(
                `INSERT INTO users (
                email, first_name, last_name, avatar, facebook_uid, google_oauth2_uid,
                city, country, state, zip,
                is_admin, is_banned, total_sale_posts, total_swap_posts, total_need_posts, total_rent_posts, total_posts,
                created_at, updated_at)
                VALUES ($1, $2, $3, $4, CASE WHEN $5 = 'facebook' THEN $6 ELSE NULL END, CASE WHEN $5 = 'google' THEN $6 ELSE NULL END, $7, $8, $9, $10, FALSE, FALSE, 0, 0, 0, 0, 0, NOW(), NOW())
                RETURNING *`,
                [email, firstName, lastName, avatar, provider, socialId, city, country, state, zip]
            );
        }

        res.json(user.rows[0]);
    } catch (err) {
        console.error('Error in /api/social-login: ', err.message);
        console.error('Offending data: ', {email, firstName, lastName, avatar, socialId, provider, city, country, state, zip});
        res.status(500).send('Server error');
    }
});

app.post('/api/posts', async (req, res) => {
    const { body, isRent, isSwap, isNeed, isSale, isMale, isFemale, userId, image } = req.body;

    try {
        const newPost = await pool.query(
            'INSERT INTO posts (body, is_rent, is_swap, is_need, is_sale, is_male, is_female, user_id, image, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING *',
            [body, isRent, isSwap, isNeed, isSale, isMale, isFemale, userId, image]
        );

        await pool.query('UPDATE users SET total_posts = total_posts + 1 WHERE id = $1', [userId]);

        res.json(newPost.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/api/user/:provider/:socialId', async (req, res) => {
    const { provider, socialId } = req.params;

    let query;
    if (provider === 'facebook') {
        query = 'SELECT * FROM users WHERE facebook_uid = $1';
    } else if (provider === 'google') {
        query = 'SELECT * FROM users WHERE google_oauth2_uid = $1';
    } else {
        return res.status(400).send('Invalid provider');
    }

    try {
        const user = await pool.query(query, [socialId]);
        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.get('/api/user/:userId', async (req, res) => {
    const userId = req.params.userId;

    try {
        const user = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            res.status(404).send('User not found');
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

app.listen(5001, () => {
    console.log('Server is running on port 5001');
});
