// 单词背诵计划生成器 JavaScript 文件

// 获取DOM元素
const planForm = document.getElementById('planForm');
const totalWordsInput = document.getElementById('totalWords');
const studyDaysInput = document.getElementById('studyDays');
const includeReviewSelect = document.getElementById('includeReview');
const outputSection = document.getElementById('outputSection');
const planTableBody = document.getElementById('planTableBody');
const copyBtn = document.getElementById('copyBtn');
const copySuccess = document.getElementById('copySuccess');

// 表单提交事件处理
planForm.addEventListener('submit', function(e) {
    e.preventDefault(); // 阻止表单默认提交行为
    
    try {
        // 获取并验证输入数据
        const totalWords = parseInt(totalWordsInput.value);
        const planDays = parseInt(studyDaysInput.value);
        const needReview = includeReviewSelect.value;
        
        // 输入验证
        if (!validateInputs(totalWords, planDays)) {
            return;
        }
        
        // 生成背诵计划
        const plan = generateStudyPlan(totalWords, planDays, needReview);
        
        // 渲染表格
        renderPlanTable(plan);
        
        // 绘制遗忘曲线图表
        drawForgettingCurveChart();
        
        // 显示输出区域
        outputSection.style.display = 'block';
        
        // 滚动到输出区域
        outputSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        alert('生成计划时出错：' + error.message);
    }
});

// 输入验证函数
function validateInputs(totalWords, planDays) {
    // 检查是否为有效数字
    if (isNaN(totalWords) || isNaN(planDays) || totalWords <= 0 || planDays <= 0) {
        alert('请输入有效的数字！');
        return false;
    }
    
    // 检查总单词量是否小于计划天数
    if (totalWords < planDays) {
        alert('总单词量不能小于计划天数，请调整！');
        return false;
    }
    
    return true;
}

// 生成背诵计划函数 - 灵活适应任意天数，确保学习和复习双重完成
function generateStudyPlan(totalWords, planDays, needReview) {
    const plan = [];
    
    // 智能单词分配策略
    const getOptimalDistribution = (totalWords, planDays) => {
        // 基础分配：平均分配
        const baseDaily = Math.floor(totalWords / planDays);
        const remainder = totalWords % planDays;
        
        // 前remainder天每天多分配1个单词，确保总量精确
        const distribution = [];
        for (let i = 0; i < planDays; i++) {
            distribution.push(i < remainder ? baseDaily + 1 : baseDaily);
        }
        return distribution;
    };
    
    // 获取新单词分配方案
    const wordDistribution = getOptimalDistribution(totalWords, planDays);
    
    // 动态复习间隔模式 - 基于用户10天标准提取的规律
    const getReviewPattern = (currentDay, totalDays) => {
        // 短计划（1-10天）使用精确模式
        if (totalDays <= 10) {
            const patterns = {
                1: [], // 第1天无复习
                2: [1], // 第2天复习第1天
                3: [1, 2], // 第3天复习第1-2天
                4: [2, 3], // 第4天复习第2-3天
                5: [1, 3, 4], // 第5天复习第1,3,4天
                6: [2, 4, 5], // 第6天复习第2,4,5天
                7: [3, 5, 6], // 第7天复习第3,5,6天
                8: [1, 4, 6, 7], // 第8天复习第1,4,6,7天
                9: [2, 5, 7, 8], // 第9天复习第2,5,7,8天
                10: [3, 6, 8, 9] // 第10天复习第3,6,8,9天
            };
            return patterns[currentDay] || [];
        } else {
            // 长计划（>10天）使用循环模式
            if (currentDay === 1) return [];
            
            // 基于黄金复习间隔：1, 2, 4, 7, 15天
            const goldenIntervals = [1, 2, 4, 7, 15];
            const reviewDays = [];
            
            goldenIntervals.forEach(interval => {
                const reviewDay = currentDay - interval;
                if (reviewDay >= 1) {
                    reviewDays.push(reviewDay);
                }
            });
            
            // 限制复习天数不超过4天，避免任务过重
            return reviewDays.slice(0, 4);
        }
    };
    
    for (let day = 1; day <= planDays; day++) {
        // 当前天的新单词量（使用预分配方案）
        const currentDayNewWords = wordDistribution[day - 1];
        
        // 计算复习量（基于动态模式）
        let reviewWords = 0;
        let reviewSources = []; // 记录复习来源，用于备注
        
        if (needReview === 'yes' && day > 1) {
            // 获取当前天的复习模式
            const reviewDays = getReviewPattern(day, planDays);
            
            // 计算复习单词总量
            reviewDays.forEach(reviewDay => {
                const sourceIndex = reviewDay - 1;
                if (sourceIndex >= 0 && sourceIndex < plan.length) {
                    const reviewAmount = plan[sourceIndex].newWords;
                    reviewWords += reviewAmount;
                    reviewSources.push(`第${reviewDay}天: ${reviewAmount}个`);
                }
            });
        }
        
        // 计算当日总任务量
        const totalDaily = currentDayNewWords + reviewWords;
        
        // 生成备注信息
        let note = `学习后当天复习本次新单词${currentDayNewWords}个`;
        if (reviewSources.length > 0) {
            note = `复习来源: ${reviewSources.join(', ')}`;
        }
        
        // 添加到计划数组
        plan.push({
            day: day,
            newWords: currentDayNewWords,
            reviewWords: reviewWords,
            totalDaily: totalDaily,
            reviewSources: reviewSources,
            note: note
        });
    }
    
    return plan;
}

// 渲染计划表格函数
function renderPlanTable(plan) {
    // 清空表格原有内容
    planTableBody.innerHTML = '';
    
    // 循环生成表格行
    plan.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>第${item.day}天</td>
            <td>${item.newWords}</td>
            <td>${item.reviewWords}</td>
            <td>${item.totalDaily}</td>
            <td>${item.note}</td>
        `;
        planTableBody.appendChild(row);
    });
}

// 复制按钮事件处理
copyBtn.addEventListener('click', async function() {
    try {
        // 生成要复制的文本内容
        let copyText = '单词背诵计划\n';
        copyText += '-------------------------\n';
        copyText += '第几天\t新单词量\t复习单词量\t当日总任务量\n';
        copyText += '-------------------------\n';
        
        // 获取表格数据
        const rows = planTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            copyText += `${cells[0].textContent}\t${cells[1].textContent}\t${cells[2].textContent}\t${cells[3].textContent}\n`;
        });
        
        // 使用现代API复制到剪贴板
        await navigator.clipboard.writeText(copyText);
        
        // 显示复制成功提示
        copySuccess.style.display = 'block';
        
        // 3秒后隐藏提示
        setTimeout(() => {
            copySuccess.style.display = 'none';
        }, 3000);
        
    } catch (error) {
        // 复制失败时的处理
        console.error('复制失败:', error);
        alert('复制失败，请手动复制表格内容');
        
        // 备选方案：选中表格内容供用户手动复制
        selectTableContent();
    }
});

// 备选复制方案：选中表格内容
function selectTableContent() {
    const table = document.querySelector('.study-plan-table');
    const range = document.createRange();
    range.selectNodeContents(table);
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    // 提示用户手动复制
    alert('已选中表格内容，请按 Ctrl+C 复制');
}

// 输入框实时验证
totalWordsInput.addEventListener('input', function() {
    const value = parseInt(this.value);
    if (isNaN(value) || value < 1) {
        this.setCustomValidity('请输入大于0的数字');
    } else {
        this.setCustomValidity('');
    }
});

studyDaysInput.addEventListener('input', function() {
    const value = parseInt(this.value);
    if (isNaN(value) || value < 1) {
        this.setCustomValidity('请输入大于0的数字');
    } else {
        this.setCustomValidity('');
    }
});

// 遗忘曲线数据生成函数
function generateForgettingCurveData() {
    const data = [];
    const days = 30; // 30天的数据
    
    // 艾宾浩斯遗忘曲线公式：R = e^(-t/S)，其中R是记忆保持率，t是时间，S是记忆强度参数
    // 无复习的自然遗忘曲线
    for (let day = 0; day <= days; day++) {
        const retentionWithoutReview = Math.exp(-day / 7) * 100; // 7天记忆强度参数
        const retentionWithReview = day === 0 ? 100 : (day % 1 === 0 ? 95 : Math.exp(-day / 21) * 100); // 有复习的保持率
        
        data.push({
            day: day,
            retentionWithoutReview: Math.max(retentionWithoutReview, 5), // 最低保持5%
            retentionWithReview: Math.max(retentionWithReview, 60) // 有复习最低保持60%
        });
    }
    
    return data;
}

// 绘制遗忘曲线图表函数
function drawForgettingCurveChart() {
    const canvas = document.getElementById('forgettingCurveChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = generateForgettingCurveData();
    
    // 设置画布尺寸
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置样式
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // 绘制坐标轴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    // Y轴
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    // X轴
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // 绘制网格线和标签
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#666';
    
    // Y轴标签（记忆保持率）
    for (let i = 0; i <= 10; i++) {
        const y = height - padding - (i * chartHeight / 10);
        const value = i * 10;
        
        // 网格线
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        
        // 标签
        ctx.textAlign = 'right';
        ctx.fillText(value + '%', padding - 10, y + 4);
    }
    
    // X轴标签（天数）
    for (let i = 0; i <= 6; i++) {
        const x = padding + (i * chartWidth / 6);
        const day = i * 5; // 每5天一个标签
        
        // 网格线
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
        
        // 标签
        ctx.textAlign = 'center';
        ctx.fillText(day + '天', x, height - padding + 20);
    }
    
    // 绘制无复习曲线（红色）
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (point.day / 30) * chartWidth;
        const y = height - padding - (point.retentionWithoutReview / 100) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // 绘制有复习曲线（绿色）
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    data.forEach((point, index) => {
        const x = padding + (point.day / 30) * chartWidth;
        const y = height - padding - (point.retentionWithReview / 100) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
    
    // 标注复习节点
    const reviewIntervals = [1, 2, 4, 7, 15, 30];
    ctx.fillStyle = '#ff9500';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    
    reviewIntervals.forEach(interval => {
        if (interval <= 30) {
            const x = padding + (interval / 30) * chartWidth;
            const y = height - padding - (data[interval].retentionWithReview / 100) * chartHeight;
            
            // 绘制标记点
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#ff9500';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 标注天数
            ctx.fillStyle = '#ff9500';
            ctx.font = '12px Arial';
            ctx.fillText(interval + '天', x, y - 15);
        }
    });
    
    // 添加标题
    ctx.fillStyle = '#333';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('遗忘曲线：记忆保持率随时间变化', width / 2, 25);
    
    // 添加轴标签
    ctx.font = '14px Arial';
    ctx.fillText('时间（天）', width / 2, height - 10);
    
    ctx.save();
    ctx.translate(20, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('记忆保持率（%）', 0, 0);
    ctx.restore();
}

// 页面加载完成后的初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('单词背诵计划生成器已加载完成');
    
    // 添加一些交互效果
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.borderColor = '#0088ff';
            this.style.boxShadow = '0 0 0 2px rgba(0, 136, 255, 0.1)';
        });
        
        input.addEventListener('blur', function() {
            this.style.borderColor = '#ddd';
            this.style.boxShadow = 'none';
        });
    });
});