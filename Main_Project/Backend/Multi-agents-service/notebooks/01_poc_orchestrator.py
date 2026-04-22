"""
=============================================================================
PoC: RL-Based Agent Orchestrator for Investment Chatbot
=============================================================================
Mục tiêu: Huấn luyện một RL agent (Q-Learning) học cách điều phối
các skill agents (Fundamental, Technical, Screening) dựa trên loại
câu hỏi đầu tư của người dùng.

Kiến trúc:
  User Query → [Feature Extraction] → [RL Orchestrator] → [Agent Selection] → Result
                                              ↑                    ↓
                                         Q-table update ← Reward Signal

Thuật toán lõi: Q-Learning với ε-greedy exploration
  Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]
=============================================================================
"""

import numpy as np
import random
import json
from collections import defaultdict
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

# =============================================================================
# PHẦN 1: ĐỊNH NGHĨA CÁC AGENT (SKILLS)
# =============================================================================
# Mỗi agent là một service độc lập, nhận input và trả output.
# Trong PoC, chúng ta mô phỏng bằng các hàm Python.

@dataclass
class AgentResult:
    """Kết quả trả về từ mỗi agent"""
    agent_name: str
    confidence: float  # 0-1, agent tự đánh giá độ tin cậy
    result: dict
    execution_time_ms: float  # mô phỏng thời gian xử lý


class FundamentalAgent:
    """
    Agent phân tích cơ bản - Chuyên về:
    - Chỉ số tài chính: P/E, P/B, ROE, EPS, Debt/Equity
    - Đọc báo cáo tài chính
    - Đánh giá giá trị nội tại (intrinsic value)
    """
    name = "fundamental"
    
    # Các từ khóa mà agent này xử lý tốt
    keywords = [
        "P/E", "PE", "ROE", "EPS", "doanh thu", "lợi nhuận", "revenue",
        "báo cáo tài chính", "financial report", "cổ tức", "dividend",
        "giá trị nội tại", "intrinsic value", "book value", "P/B",
        "biên lợi nhuận", "margin", "nợ", "debt", "equity",
        "balance sheet", "income statement", "cash flow",
        "định giá", "valuation", "DCF", "fundamental"
    ]
    
    def execute(self, query: str, context: dict = None) -> AgentResult:
        """Mô phỏng phân tích cơ bản"""
        relevance = self._calculate_relevance(query)
        
        # Mô phỏng kết quả phân tích
        result = {
            "analysis_type": "fundamental",
            "metrics": {
                "P/E": round(random.uniform(8, 35), 2),
                "ROE": round(random.uniform(0.05, 0.30), 4),
                "EPS": round(random.uniform(1000, 15000), 0),
                "Debt_to_Equity": round(random.uniform(0.1, 2.5), 2),
            },
            "recommendation": random.choice(["BUY", "HOLD", "SELL"]),
            "relevance_score": relevance
        }
        
        return AgentResult(
            agent_name=self.name,
            confidence=relevance,
            result=result,
            execution_time_ms=random.uniform(100, 500)
        )
    
    def _calculate_relevance(self, query: str) -> float:
        """Tính mức độ phù hợp của query với agent này"""
        query_lower = query.lower()
        matches = sum(1 for kw in self.keywords if kw.lower() in query_lower)
        return min(1.0, matches * 0.25 + 0.1)


class TechnicalAgent:
    """
    Agent phân tích kỹ thuật - Chuyên về:
    - Chỉ báo kỹ thuật: MA, RSI, MACD, Bollinger Bands
    - Nhận diện mẫu hình nến (candlestick patterns)
    - Xác định xu hướng và điểm vào/ra
    """
    name = "technical"
    
    keywords = [
        "MA", "SMA", "EMA", "RSI", "MACD", "Bollinger", "xu hướng",
        "trend", "support", "resistance", "hỗ trợ", "kháng cự",
        "nến", "candlestick", "chart", "biểu đồ", "volume",
        "khối lượng", "breakout", "momentum", "stochastic",
        "đường trung bình", "moving average", "tín hiệu",
        "signal", "mua bán", "entry", "exit", "technical"
    ]
    
    def execute(self, query: str, context: dict = None) -> AgentResult:
        relevance = self._calculate_relevance(query)
        
        result = {
            "analysis_type": "technical",
            "indicators": {
                "RSI_14": round(random.uniform(20, 80), 2),
                "MACD_signal": random.choice(["BULLISH", "BEARISH", "NEUTRAL"]),
                "SMA_50_vs_200": random.choice(["GOLDEN_CROSS", "DEATH_CROSS", "NEUTRAL"]),
                "Support": round(random.uniform(20000, 50000), 0),
                "Resistance": round(random.uniform(50000, 100000), 0),
            },
            "trend": random.choice(["UPTREND", "DOWNTREND", "SIDEWAYS"]),
            "relevance_score": relevance
        }
        
        return AgentResult(
            agent_name=self.name,
            confidence=relevance,
            result=result,
            execution_time_ms=random.uniform(50, 300)
        )
    
    def _calculate_relevance(self, query: str) -> float:
        query_lower = query.lower()
        matches = sum(1 for kw in self.keywords if kw.lower() in query_lower)
        return min(1.0, matches * 0.25 + 0.1)


class ScreeningAgent:
    """
    Agent sàng lọc cổ phiếu - Chuyên về:
    - Lọc cổ phiếu theo tiêu chí người dùng
    - So sánh nhiều mã cổ phiếu
    - Xếp hạng theo sector/industry
    """
    name = "screening"
    
    keywords = [
        "lọc", "sàng lọc", "screen", "filter", "so sánh", "compare",
        "top", "best", "tốt nhất", "xếp hạng", "ranking", "sector",
        "ngành", "industry", "danh sách", "list", "tiêu chí",
        "criteria", "tìm", "search", "find", "which", "nào",
        "recommend", "gợi ý", "đề xuất", "suggestion"
    ]
    
    def execute(self, query: str, context: dict = None) -> AgentResult:
        relevance = self._calculate_relevance(query)
        
        result = {
            "analysis_type": "screening",
            "filtered_stocks": [
                {"ticker": "VNM", "score": 8.5},
                {"ticker": "FPT", "score": 8.2},
                {"ticker": "VCB", "score": 7.9},
            ],
            "criteria_used": ["P/E < 15", "ROE > 15%", "Market Cap > 10T"],
            "relevance_score": relevance
        }
        
        return AgentResult(
            agent_name=self.name,
            confidence=relevance,
            result=result,
            execution_time_ms=random.uniform(200, 800)
        )
    
    def _calculate_relevance(self, query: str) -> float:
        query_lower = query.lower()
        matches = sum(1 for kw in self.keywords if kw.lower() in query_lower)
        return min(1.0, matches * 0.25 + 0.1)


# =============================================================================
# PHẦN 2: TẠO DATASET (SYNTHETIC) & FEATURE EXTRACTION
# =============================================================================

# Dataset: Mỗi mẫu = (query, correct_agent_label)
# Trong production, dataset này đến từ log thực tế + human annotation

TRAINING_DATA = [
    # --- Fundamental queries ---
    ("Chỉ số P/E của VNM hiện tại là bao nhiêu?", "fundamental"),
    ("Phân tích báo cáo tài chính quý 3 của FPT", "fundamental"),
    ("ROE của VCB so với ngành ngân hàng như thế nào?", "fundamental"),
    ("EPS tăng trưởng của HPG trong 5 năm qua", "fundamental"),
    ("Tỷ lệ nợ trên vốn chủ sở hữu của VIC", "fundamental"),
    ("Doanh thu và lợi nhuận ròng của MWG quý vừa rồi", "fundamental"),
    ("Cổ tức mà VNM trả trong năm nay là bao nhiêu?", "fundamental"),
    ("Định giá DCF cho cổ phiếu FPT", "fundamental"),
    ("Biên lợi nhuận gộp của MSN đang ở mức nào?", "fundamental"),
    ("Balance sheet của TCB có gì đáng chú ý?", "fundamental"),
    ("Giá trị nội tại của VHM theo phương pháp P/B", "fundamental"),
    ("Cash flow từ hoạt động kinh doanh của VRE", "fundamental"),
    ("Income statement của PNJ cho thấy điều gì?", "fundamental"),
    ("Tỷ suất cổ tức dividend yield của REE", "fundamental"),
    ("Phân tích fundamental cổ phiếu ngành thép", "fundamental"),
    
    # --- Technical queries ---
    ("RSI của VNM đang ở vùng quá mua hay quá bán?", "technical"),
    ("MACD của FPT cho tín hiệu gì?", "technical"),
    ("Đường MA50 và MA200 của VCB cắt nhau chưa?", "technical"),
    ("Xu hướng giá HPG trong 3 tháng gần đây", "technical"),
    ("Vùng hỗ trợ và kháng cự của VIC ở đâu?", "technical"),
    ("Biểu đồ nến của MWG tuần này có mẫu hình gì?", "technical"),
    ("Khối lượng giao dịch VNM có tăng đột biến không?", "technical"),
    ("Bollinger Bands của TCB đang co hẹp hay mở rộng?", "technical"),
    ("Điểm entry tốt để mua VHM theo phân tích kỹ thuật", "technical"),
    ("Tín hiệu mua bán từ Stochastic oscillator cho PNJ", "technical"),
    ("Chart pattern của MSN - có breakout không?", "technical"),
    ("EMA 20 ngày của REE đang cho tín hiệu gì?", "technical"),
    ("Momentum của ngành ngân hàng đang tăng hay giảm?", "technical"),
    ("Volume profile của VRE cho thấy vùng giá nào quan trọng?", "technical"),
    ("Phân tích technical xu hướng cổ phiếu công nghệ", "technical"),
    
    # --- Screening queries ---
    ("Lọc ra top 10 cổ phiếu có P/E thấp nhất sàn HOSE", "screening"),
    ("So sánh VNM, VCB và FPT - cổ phiếu nào tốt hơn?", "screening"),
    ("Tìm cổ phiếu ngành bất động sản có ROE trên 15%", "screening"),
    ("Gợi ý 5 cổ phiếu tốt nhất để đầu tư dài hạn", "screening"),
    ("Xếp hạng cổ phiếu ngành ngân hàng theo vốn hóa", "screening"),
    ("Danh sách cổ phiếu có cổ tức cao nhất năm nay", "screening"),
    ("Cổ phiếu nào trong ngành công nghệ đáng mua nhất?", "screening"),
    ("So sánh hiệu suất các cổ phiếu trong VN30", "screening"),
    ("Filter cổ phiếu có market cap trên 10 nghìn tỷ", "screening"),
    ("Recommend cổ phiếu phù hợp cho người mới bắt đầu", "screening"),
    ("Tìm kiếm cổ phiếu penny stock tiềm năng", "screening"),
    ("Đề xuất portfolio 5 mã cho ngân sách 100 triệu", "screening"),
    ("Top cổ phiếu tăng giá mạnh nhất tháng qua", "screening"),
    ("Sàng lọc cổ phiếu theo tiêu chí Buffett", "screening"),
    ("Which stocks in the banking sector should I buy?", "screening"),
]

# Chia train/test
random.seed(42)
shuffled = TRAINING_DATA.copy()
random.shuffle(shuffled)
split = int(0.8 * len(shuffled))
TRAIN_SET = shuffled[:split]
TEST_SET = shuffled[split:]

print(f"📊 Dataset: {len(TRAINING_DATA)} mẫu")
print(f"   Train: {len(TRAIN_SET)} | Test: {len(TEST_SET)}")
print(f"   Phân bố: Fundamental={sum(1 for _,l in TRAINING_DATA if l=='fundamental')}, "
      f"Technical={sum(1 for _,l in TRAINING_DATA if l=='technical')}, "
      f"Screening={sum(1 for _,l in TRAINING_DATA if l=='screening')}")


# --- Feature Extraction ---
# Chuyển query text → state vector (đơn giản hóa cho PoC)

AGENT_REGISTRY = {
    "fundamental": FundamentalAgent(),
    "technical": TechnicalAgent(),
    "screening": ScreeningAgent(),
}

ACTION_SPACE = list(AGENT_REGISTRY.keys())
ACTION_TO_IDX = {a: i for i, a in enumerate(ACTION_SPACE)}
N_ACTIONS = len(ACTION_SPACE)


def extract_state(query: str) -> int:
    """
    Chuyển query thành state (discrete).
    
    Phương pháp: Tính relevance score từ mỗi agent, 
    discretize thành state index.
    
    Trong production: Dùng text embedding (BERT, sentence-transformers)
    rồi clustering hoặc đưa thẳng vào DQN.
    """
    scores = []
    for agent_name in ACTION_SPACE:
        agent = AGENT_REGISTRY[agent_name]
        relevance = agent._calculate_relevance(query)
        scores.append(relevance)
    
    # Discretize: mỗi score chia thành 3 mức (low/med/high)
    # → State space = 3^3 = 27 states
    discretized = []
    for s in scores:
        if s < 0.3:
            discretized.append(0)  # low
        elif s < 0.6:
            discretized.append(1)  # medium
        else:
            discretized.append(2)  # high
    
    # Encode thành single integer
    state = discretized[0] * 9 + discretized[1] * 3 + discretized[2]
    return state


def compute_reward(chosen_agent: str, correct_agent: str, agent_result: AgentResult) -> float:
    """
    Tính reward signal cho orchestrator.
    
    Reward design rất quan trọng - nó quyết định hành vi của agent:
    - Chọn đúng agent → reward cao
    - Chọn sai agent → penalty
    - Bonus nếu agent có confidence cao
    - Penalty nếu execution time quá lâu
    """
    reward = 0.0
    
    # Core reward: chọn đúng agent
    if chosen_agent == correct_agent:
        reward += 1.0
    else:
        reward -= 0.5
    
    # Bonus: confidence cao (agent tự tin về kết quả)
    reward += agent_result.confidence * 0.3
    
    # Penalty nhẹ cho thời gian xử lý lâu (khuyến khích hiệu quả)
    if agent_result.execution_time_ms > 500:
        reward -= 0.1
    
    return reward


# =============================================================================
# PHẦN 3: Q-LEARNING ORCHESTRATOR
# =============================================================================

class QLearningOrchestrator:
    """
    Bộ điều phối sử dụng Q-Learning.
    
    Q-Learning Formula:
        Q(s,a) ← Q(s,a) + α[r + γ·max_a' Q(s',a') - Q(s,a)]
    
    Trong đó:
        s = state (loại query, được discretize)
        a = action (chọn agent nào)
        r = reward (chọn đúng agent? confidence? speed?)
        α = learning rate
        γ = discount factor  
        ε = exploration rate (giảm dần)
    """
    
    def __init__(
        self,
        n_states: int = 27,     # 3^3 states
        n_actions: int = 3,      # 3 agents
        learning_rate: float = 0.1,
        discount_factor: float = 0.95,
        epsilon_start: float = 1.0,
        epsilon_end: float = 0.01,
        epsilon_decay: float = 0.995,
    ):
        self.n_states = n_states
        self.n_actions = n_actions
        self.lr = learning_rate
        self.gamma = discount_factor
        self.epsilon = epsilon_start
        self.epsilon_end = epsilon_end
        self.epsilon_decay = epsilon_decay
        
        # Q-table: khởi tạo bằng 0
        self.q_table = np.zeros((n_states, n_actions))
        
        # Tracking cho MLflow-style logging
        self.training_history = {
            "episode_rewards": [],
            "episode_accuracy": [],
            "epsilon_values": [],
            "q_table_snapshots": [],
        }
    
    def select_action(self, state: int, training: bool = True) -> int:
        """
        Chọn action theo ε-greedy policy.
        
        - Với xác suất ε: chọn ngẫu nhiên (explore)
        - Với xác suất 1-ε: chọn action có Q-value cao nhất (exploit)
        """
        if training and random.random() < self.epsilon:
            return random.randint(0, self.n_actions - 1)
        else:
            return int(np.argmax(self.q_table[state]))
    
    def update(self, state: int, action: int, reward: float, next_state: int):
        """
        Cập nhật Q-value theo Bellman equation.
        
        Q(s,a) ← Q(s,a) + α[r + γ·max Q(s',a') - Q(s,a)]
        """
        best_next = np.max(self.q_table[next_state])
        td_target = reward + self.gamma * best_next
        td_error = td_target - self.q_table[state, action]
        self.q_table[state, action] += self.lr * td_error
    
    def decay_epsilon(self):
        """Giảm epsilon sau mỗi episode"""
        self.epsilon = max(self.epsilon_end, self.epsilon * self.epsilon_decay)
    
    def train(self, dataset: list, n_episodes: int = 500, verbose: bool = True):
        """
        Huấn luyện orchestrator trên dataset.
        
        Mỗi episode: đi qua toàn bộ dataset, chọn agent cho từng query,
        nhận reward, cập nhật Q-table.
        """
        print("\n" + "="*60)
        print("🎯 BẮT ĐẦU HUẤN LUYỆN Q-LEARNING ORCHESTRATOR")
        print("="*60)
        print(f"   States: {self.n_states} | Actions: {self.n_actions}")
        print(f"   LR: {self.lr} | γ: {self.gamma} | ε: {self.epsilon:.2f}→{self.epsilon_end}")
        print(f"   Episodes: {n_episodes} | Dataset size: {len(dataset)}")
        print("-"*60)
        
        for episode in range(n_episodes):
            episode_reward = 0
            correct_count = 0
            total_count = 0
            
            # Shuffle dataset mỗi episode
            random.shuffle(dataset)
            
            for i, (query, correct_label) in enumerate(dataset):
                # 1. Extract state
                state = extract_state(query)
                
                # 2. Select action (ε-greedy)
                action_idx = self.select_action(state, training=True)
                chosen_agent_name = ACTION_SPACE[action_idx]
                
                # 3. Execute agent
                agent = AGENT_REGISTRY[chosen_agent_name]
                result = agent.execute(query)
                
                # 4. Compute reward
                reward = compute_reward(chosen_agent_name, correct_label, result)
                
                # 5. Get next state (from next query, hoặc terminal)
                if i + 1 < len(dataset):
                    next_query = dataset[i + 1][0]
                    next_state = extract_state(next_query)
                else:
                    next_state = state  # terminal
                
                # 6. Update Q-table
                self.update(state, action_idx, reward, next_state)
                
                episode_reward += reward
                if chosen_agent_name == correct_label:
                    correct_count += 1
                total_count += 1
            
            # Decay exploration
            self.decay_epsilon()
            
            # Log metrics
            accuracy = correct_count / total_count
            self.training_history["episode_rewards"].append(episode_reward)
            self.training_history["episode_accuracy"].append(accuracy)
            self.training_history["epsilon_values"].append(self.epsilon)
            
            if episode % 50 == 0 and verbose:
                print(f"   Episode {episode:4d} | "
                      f"Reward: {episode_reward:7.2f} | "
                      f"Accuracy: {accuracy:.1%} | "
                      f"ε: {self.epsilon:.4f}")
        
        # Final snapshot
        self.training_history["q_table_snapshots"].append(self.q_table.copy())
        
        print("-"*60)
        final_acc = self.training_history["episode_accuracy"][-1]
        print(f"✅ Huấn luyện hoàn tất! Final accuracy: {final_acc:.1%}")
        print(f"   Final ε: {self.epsilon:.4f}")
        return self.training_history
    
    def evaluate(self, test_set: list) -> dict:
        """Đánh giá trên test set (không exploration)"""
        correct = 0
        total = 0
        results_detail = []
        
        for query, correct_label in test_set:
            state = extract_state(query)
            action_idx = self.select_action(state, training=False)
            chosen = ACTION_SPACE[action_idx]
            
            is_correct = chosen == correct_label
            correct += int(is_correct)
            total += 1
            
            results_detail.append({
                "query": query[:50] + "...",
                "correct_agent": correct_label,
                "chosen_agent": chosen,
                "match": "✅" if is_correct else "❌",
                "q_values": {
                    ACTION_SPACE[i]: round(self.q_table[state, i], 3)
                    for i in range(self.n_actions)
                }
            })
        
        accuracy = correct / total
        return {
            "accuracy": accuracy,
            "correct": correct,
            "total": total,
            "details": results_detail
        }
    
    def predict(self, query: str) -> dict:
        """Inference: chọn agent tốt nhất cho query mới"""
        state = extract_state(query)
        action_idx = self.select_action(state, training=False)
        chosen = ACTION_SPACE[action_idx]
        
        # Execute agent
        agent = AGENT_REGISTRY[chosen]
        result = agent.execute(query)
        
        return {
            "query": query,
            "selected_agent": chosen,
            "confidence": result.confidence,
            "q_values": {
                ACTION_SPACE[i]: round(self.q_table[state, i], 3)
                for i in range(self.n_actions)
            },
            "agent_result": result.result
        }


# =============================================================================
# PHẦN 4: CHẠY HUẤN LUYỆN & ĐÁNH GIÁ
# =============================================================================

def run_poc():
    """Chạy toàn bộ pipeline PoC"""
    
    # 1. Khởi tạo orchestrator
    orchestrator = QLearningOrchestrator(
        n_states=27,
        n_actions=N_ACTIONS,
        learning_rate=0.15,
        discount_factor=0.9,
        epsilon_start=1.0,
        epsilon_end=0.01,
        epsilon_decay=0.99,
    )
    
    # 2. Huấn luyện
    history = orchestrator.train(TRAIN_SET, n_episodes=300, verbose=True)
    
    # 3. Đánh giá trên test set
    print("\n" + "="*60)
    print("📈 ĐÁNH GIÁ TRÊN TEST SET")
    print("="*60)
    
    eval_results = orchestrator.evaluate(TEST_SET)
    print(f"\n   Test Accuracy: {eval_results['accuracy']:.1%} "
          f"({eval_results['correct']}/{eval_results['total']})")
    
    print("\n   Chi tiết từng mẫu test:")
    print("   " + "-"*56)
    for detail in eval_results["details"]:
        print(f"   {detail['match']} Query: {detail['query']}")
        print(f"      Correct: {detail['correct_agent']:12s} | "
              f"Chosen: {detail['chosen_agent']:12s}")
        print(f"      Q-values: {detail['q_values']}")
    
    # 4. Thử inference với queries mới
    print("\n" + "="*60)
    print("🔮 THỬ INFERENCE VỚI QUERIES MỚI")
    print("="*60)
    
    new_queries = [
        "P/E ratio của VNM có hợp lý không so với ngành?",
        "RSI cho thấy FPT đang quá mua phải không?",
        "Tìm cho tôi 5 cổ phiếu ngành ngân hàng tốt nhất",
        "Phân tích xu hướng giá và đường MA của HPG",
        "Báo cáo lợi nhuận quý 4 của VCB ra sao?",
        "So sánh VNM với Vinamilk competitors - mã nào nên mua?",
    ]
    
    for query in new_queries:
        prediction = orchestrator.predict(query)
        print(f"\n   📝 Query: \"{query}\"")
        print(f"   🎯 Selected Agent: {prediction['selected_agent']}")
        print(f"   📊 Q-values: {prediction['q_values']}")
        print(f"   💡 Confidence: {prediction['confidence']:.2f}")
    
    # 5. Hiển thị Q-table (learned policy)
    print("\n" + "="*60)
    print("📋 Q-TABLE (LEARNED POLICY)")
    print("="*60)
    
    # Chỉ hiển thị states có giá trị khác 0
    print(f"\n   {'State':>6s} | {'Fundamental':>12s} | {'Technical':>12s} | {'Screening':>12s} | {'Best Action':>12s}")
    print("   " + "-"*65)
    for s in range(orchestrator.n_states):
        row = orchestrator.q_table[s]
        if np.any(row != 0):
            best = ACTION_SPACE[np.argmax(row)]
            print(f"   {s:6d} | {row[0]:12.3f} | {row[1]:12.3f} | {row[2]:12.3f} | {best:>12s}")
    
    # 6. Training metrics summary (MLflow-style)
    print("\n" + "="*60)
    print("📊 TRAINING METRICS SUMMARY (MLflow-style)")
    print("="*60)
    
    rewards = history["episode_rewards"]
    accuracies = history["episode_accuracy"]
    
    # Tính metrics theo windows
    windows = [
        ("First 50 episodes", 0, 50),
        ("Episodes 50-150", 50, 150),
        ("Episodes 150-250", 150, 250),
        ("Last 50 episodes", -50, None),
    ]
    
    for name, start, end in windows:
        r_slice = rewards[start:end] if end else rewards[start:]
        a_slice = accuracies[start:end] if end else accuracies[start:]
        print(f"\n   {name}:")
        print(f"     Avg Reward:   {np.mean(r_slice):7.2f} ± {np.std(r_slice):.2f}")
        print(f"     Avg Accuracy: {np.mean(a_slice):7.1%} ± {np.std(a_slice):.1%}")
    
    return orchestrator, history


# =============================================================================
# PHẦN 5: HƯỚNG MỞ RỘNG (PRODUCTION ROADMAP)
# =============================================================================

ROADMAP = """
=============================================================================
🗺️  ROADMAP: TỪ PoC → PRODUCTION
=============================================================================

Phase 1 (PoC - Notebook) ← BẠN ĐANG Ở ĐÂY
├── Q-Learning với state discretized
├── 3 agents đơn giản (mô phỏng)
├── Synthetic dataset 45 mẫu
├── Metrics: routing accuracy, cumulative reward
└── Chạy trên 1 notebook

Phase 2 (Alpha - Single Service)
├── Nâng lên DQN: state = text embedding (sentence-transformers)
├── Agents thực sự gọi API (VNDirect, SSI, ...)
├── Dataset từ user logs + annotation
├── MLflow tracking experiments
└── Dockerize thành 1 service

Phase 3 (Beta - Microservices)
├── Mỗi agent = 1 microservice (K8s pods)
├── Orchestrator = central service với PPO/SAC
├── GitLab CI/CD pipeline
├── ArgoCD cho deployment
├── Action space mở rộng: multi-agent chaining
└── A/B testing routing policies

Phase 4 (Production)
├── Real-time model retraining (online RL)
├── Human-in-the-loop feedback
├── Multi-step reasoning (agent chains)
├── Dynamic agent discovery
└── Monitoring & alerting
"""


if __name__ == "__main__":
    orchestrator, history = run_poc()
    print(ROADMAP)
