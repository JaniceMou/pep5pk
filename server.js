const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  transports: ['websocket', 'polling']
});

// 静态文件
app.use(express.static(__dirname));

// 管理员后台
app.get('/admin', (req, res) => {
  const password = req.query.pwd || '';
  if (password !== 'teacher123') {
    res.send(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>后台管理</title></head>
<body style="font-family:sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f5f5f5">
<form method="get" style="background:#fff;padding:40px;border:1px solid #ddd;max-width:360px;width:90%">
<h2 style="margin:0 0 20px;font-size:1.4rem">🔐 后台管理登录</h2>
<input name="pwd" type="password" placeholder="请输入管理密码" style="width:100%;padding:12px;margin-bottom:16px;border:1px solid #ddd;font-size:1rem" autofocus>
<button style="width:100%;padding:12px;background:#167257;color:#fff;border:none;font-size:1rem;cursor:pointer">进入后台</button>
<p style="margin:12px 0 0;color:#666;font-size:.85rem">默认密码：teacher123</p>
</form></body></html>`);
    return;
  }
  
  const onlineRooms = Object.entries(rooms).map(([code, room]) => ({
    code,
    status: room.status,
    players: Object.values(room.players).map(p => p.name),
    createdAt: new Date(room.createdAt).toLocaleString('zh-CN')
  }));
  
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>PK 后台管理</title>
<style>
body{font-family:"PingFang SC","Microsoft YaHei",sans-serif;margin:0;background:#f5f5f5;color:#17212b}
.header{background:#17212b;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}
.header h1{margin:0;font-size:1.3rem}
.nav a{color:#f4c542;text-decoration:none;font-weight:800;margin-left:20px}
.container{max-width:1100px;margin:0 auto;padding:24px}
.section{background:#fff;border:1px solid #cfd7cc;padding:24px;margin-bottom:20px}
.section h2{margin:0 0 16px;font-size:1.1rem;display:flex;justify-content:space-between;align-items:center}
.refresh{background:none;border:1px solid #cfd7cc;padding:6px 14px;cursor:pointer;font-size:.85rem}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #e9eee6}
th{background:#f7f5ed;font-weight:850;color:#667085}
.empty{color:#98a2b3;text-align:center;padding:30px}
.badge{padding:3px 8px;font-size:.78rem;font-weight:850;border:1px solid #cfd7cc}
.badge.lobby{background:#eaf4ff;color:#225c91}
.badge.playing{background:#e8f6ef;color:#167257}
.badge.finished{background:#fff7d9;color:#6f5710}
</style>
</head>
<body>
<div class="header">
  <h1>📊 PEP 五下 PK · 后台管理</h1>
  <div class="nav"><a href="/">返回游戏</a></div>
</div>
<div class="container">
  <div class="section">
    <h2>🟢 当前在线房间 <span style="color:#167257;font-size:.9rem">${onlineRooms.length} 个</span></h2>
    ${onlineRooms.length === 0 ? '<div class="empty">暂无在线房间</div>' : `
    <table><thead><tr><th>房间码</th><th>状态</th><th>玩家</th><th>创建时间</th></tr></thead><tbody>
    ${onlineRooms.map(r => `<tr>
      <td><strong>${r.code}</strong></td>
      <td><span class="badge ${r.status}">${r.status === 'lobby' ? '等待中' : r.status === 'playing' ? '比赛中' : '已结束'}</span></td>
      <td>${r.players.join(' vs ')}</td>
      <td>${r.createdAt}</td>
    </tr>`).join('')}
    </tbody></table>`}
  </div>
  
  <div class="section">
    <h2>📝 历史 PK 记录 <span style="color:#667085;font-size:.9rem">最近 ${gameHistory.length} 场</span></h2>
    ${gameHistory.length === 0 ? '<div class="empty">暂无历史记录</div>' : `
    <table><thead><tr><th>时间</th><th>房间</th><th>玩家</th><th>比分</th><th>获胜者</th></tr></thead><tbody>
    ${gameHistory.map(g => `<tr>
      <td>${g.time}</td>
      <td>${g.roomCode}</td>
      <td>${g.players.map(p => p.name).join(' vs ')}</td>
      <td>${g.players.map(p => p.score).join(' : ')}</td>
      <td><strong>${g.winner}</strong></td>
    </tr>`).join('')}
    </tbody></table>`}
  </div>
</div>
<script>
// 自动刷新
setTimeout(() => location.reload(), 30000);
</script>
</body>
</html>`);
});

// ===== 正确答案索引（服务器只需这个来判分）=====
const ANSWERS = {
  u1q1:1,u1q2:1,u1q3:2,u1q4:2,u1q5:2,u1q6:1,u1q7:0,u1q8:2,u1q9:0,u1q10:2,
  u2q1:3,u2q2:1,u2q3:1,u2q4:2,u2q5:2,u2q6:3,u2q7:1,u2q8:2,u2q9:1,u2q10:2,
  u3q1:1,u3q2:1,u3q3:1,u3q4:2,u3q5:1,u3q6:1,u3q7:1,u3q8:2,u3q9:2,u3q10:1,
  u4q1:2,u4q2:2,u4q3:2,u4q4:1,u4q5:2,u4q6:1,u4q7:2,u4q8:3,u4q9:2,u4q10:2,
  u5q1:2,u5q2:1,u5q3:1,u5q4:1,u5q5:0,u5q6:1,u5q7:2,u5q8:1,u5q9:1,u5q10:1,
  u6q1:1,u6q2:2,u6q3:3,u6q4:1,u6q5:1,u6q6:1,u6q7:0,u6q8:0,u6q9:1,u6q10:1
};

// ===== 内存存储 =====
const rooms = {};
const gameHistory = []; // 存储历史 PK 记录

// 清理超过3小时的空房间
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of Object.entries(rooms)) {
    const anyOnline = Object.values(room.players).some(p => p.online);
    if (!anyOnline && now - room.createdAt > 3 * 60 * 60 * 1000) {
      delete rooms[code];
    }
  }
}, 5 * 60 * 1000);

// ===== 工具函数 =====
function makeCode() {
  let code;
  do { code = Math.random().toString(36).slice(2, 6).toUpperCase(); }
  while (rooms[code]);
  return code;
}

function shuffled(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 广播房间状态
function broadcast(roomCode) {
  io.to(roomCode).emit('room-update', rooms[roomCode]);
}

// 记录 PK 历史
function recordGameHistory(room, roomCode) {
  const players = Object.entries(room.players);
  if (players.length >= 2) {
    const sorted = players.sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
    const tie = sorted[0][1].score === sorted[1][1].score;
    gameHistory.unshift({
      time: new Date().toLocaleString('zh-CN'),
      roomCode: roomCode,
      players: players.map(([id, p]) => ({ name: p.name, score: p.score || 0 })),
      winner: tie ? '平局' : sorted[0][1].name,
      rounds: room.questionIds.length
    });
    // 只保留最近 100 条记录
    if (gameHistory.length > 100) gameHistory.pop();
  }
}

// ===== Socket.io 逻辑 =====
io.on('connection', (socket) => {
  let myUid = null;
  let myRoom = null;

  // 创建房间
  socket.on('create-room', ({ name }, callback) => {
    myUid = Math.random().toString(36).slice(2, 10);
    myRoom = makeCode();
    rooms[myRoom] = {
      hostUid: myUid,
      status: 'lobby',
      createdAt: Date.now(),
      settings: { unit: 0, count: 12, seconds: 20 },
      players: {},
      questionIds: [],
      round: 0,
      current: null,
      answers: {}
    };
    rooms[myRoom].players[myUid] = {
      name, score: 0, ready: false, online: true, joinedAt: Date.now(), streak: 0
    };
    socket.join(myRoom);
    socket.data.uid = myUid;
    socket.data.room = myRoom;
    callback({ ok: true, roomCode: myRoom, uid: myUid });
    broadcast(myRoom);
  });

  // 加入房间
  socket.on('join-room', ({ name, roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ ok: false, error: '房间不存在，请检查房间码。' });
    if (Object.keys(room.players).length >= 2 && !room.players[socket.data?.uid])
      return callback({ ok: false, error: '这个房间已经有两名学生了。' });

    myUid = socket.data.uid || Math.random().toString(36).slice(2, 10);
    myRoom = roomCode;
    socket.join(roomCode);
    socket.data.uid = myUid;
    socket.data.room = roomCode;

    if (!room.players[myUid]) {
      room.players[myUid] = {
        name, score: 0, ready: false, online: true, joinedAt: Date.now(), streak: 0
      };
    } else {
      room.players[myUid].online = true;
      room.players[myUid].name = name;
    }
    callback({ ok: true, roomCode, uid: myUid });
    broadcast(roomCode);
  });

  // 准备/取消准备
  socket.on('toggle-ready', (callback) => {
    const room = rooms[myRoom];
    if (!room || !myUid) return callback?.({ ok: false });
    room.players[myUid].ready = !room.players[myUid].ready;
    broadcast(myRoom);
    callback?.({ ok: true });
  });

  // 更新设置（仅房主）
  socket.on('update-settings', ({ unit, count }) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid) return;
    room.settings.unit = Number(unit);
    room.settings.count = Number(count);
    broadcast(myRoom);
  });

  // 开始游戏（仅房主）
  socket.on('start-game', (callback) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid) return callback?.({ ok: false });
    // 从前端发来的题目ID列表开始游戏
    callback?.({ ok: true });
    // 实际开始逻辑由房主客户端通知服务器
  });

  // 房主通知开始游戏（带题目列表）
  socket.on('game-start', ({ questionIds }, callback) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid) return callback?.({ ok: false });
    room.status = 'playing';
    room.questionIds = questionIds;
    room.round = 0;
    room.current = { questionId: questionIds[0], startedAt: Date.now(), resolved: false };
    room.answers = {};
    Object.values(room.players).forEach(p => { p.score = 0; p.streak = 0; });
    broadcast(myRoom);
    callback?.({ ok: true });
  });

  // 提交答案
  socket.on('submit-answer', ({ choice, round }) => {
    const room = rooms[myRoom];
    if (!room || !myUid || room.current?.resolved) return;
    if (!room.answers[round]) room.answers[round] = {};
    if (room.answers[round][myUid]) return;
    room.answers[round][myUid] = { choice, answeredAt: Date.now() };
    broadcast(myRoom);

    const playerCount = Object.keys(room.players).length;
    const answerCount = Object.keys(room.answers[round] || {}).length;
    if (answerCount >= playerCount) {
      io.to(myRoom).emit('all-answered', { round });
    }
  });

  // 结算本轮（仅房主）
  socket.on('resolve-round', (callback) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid || !room.current || room.current.resolved) return callback?.({ ok: false });
    const qId = room.current.questionId;
    const correctIdx = ANSWERS[qId];
    if (correctIdx === undefined) return callback?.({ ok: false, error: '题目ID不存在: ' + qId });

    room.current.resolved = true;
    const answers = room.answers[room.round] || {};
    const correct = Object.entries(answers)
      .filter(([, a]) => a.choice === correctIdx)
      .sort((a, b) => a[1].answeredAt - b[1].answeredAt);
    const correctRank = new Map(correct.map(([id], i) => [id, i]));

    for (const [id, p] of Object.entries(room.players)) {
      const ans = answers[id];
      let points = 0;
      if (ans?.choice === correctIdx) {
        const elapsed = Math.max(0, Math.floor((ans.answeredAt - room.current.startedAt) / 1000));
        const speed = Math.max(0, (room.settings.seconds || 20) - elapsed) * 3;
        points = (correctRank.get(id) === 0 ? 100 : 80) + speed;
        p.streak = (p.streak || 0) + 1;
      } else {
        p.streak = 0;
      }
      p.score = (p.score || 0) + points;
      if (ans) room.answers[room.round][id].points = points;
    }
    broadcast(myRoom);
    callback?.({ ok: true });
  });

  // 下一轮（仅房主）
  socket.on('next-round', (callback) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid) return callback?.({ ok: false });
    const next = room.round + 1;
    if (next >= room.questionIds.length) {
      room.status = 'finished';
      // 记录 PK 结果
      recordGameHistory(room, myRoom);
    } else {
      room.round = next;
      room.current = { questionId: room.questionIds[next], startedAt: Date.now(), resolved: false };
      room.answers = {};
    }
    broadcast(myRoom);
    callback?.({ ok: true });
  });

  // 返回大厅（仅房主）
  socket.on('back-to-lobby', (callback) => {
    const room = rooms[myRoom];
    if (!room || room.hostUid !== myUid) return callback?.({ ok: false });
    
    // 记录 PK 结果到历史（如果还没记录）
    if (room.status === 'finished') {
      recordGameHistory(room, myRoom);
    }
    
    room.status = 'lobby';
    room.questionIds = [];
    room.round = 0;
    room.current = null;
    room.answers = {};
    Object.values(room.players).forEach(p => { p.ready = false; p.score = 0; p.streak = 0; });
    broadcast(myRoom);
    callback?.({ ok: true });
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (myRoom && rooms[myRoom] && myUid) {
      const room = rooms[myRoom];
      if (room.players[myUid]) {
        room.players[myUid].online = false;
      }
      const anyOnline = Object.values(room.players).some(p => p.online);
      if (!anyOnline) {
        setTimeout(() => {
          if (rooms[myRoom] && !Object.values(rooms[myRoom].players).some(p => p.online)) {
            delete rooms[myRoom];
          }
        }, 5 * 60 * 1000);
      }
      broadcast(myRoom);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('PK server running on :' + PORT);
});
