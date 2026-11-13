(function(g){'use strict';
const KEYS={company:'被审计单位主档(必须上传)',bank:'被审计单位银行账号主档信息',related:'关联方主档信息',customer:'客户主档信息',supplier:'供应商主档信息',employee:'员工主档信息',gl:'总账科目余额表',balance:'分账号科目余额表',flow:'全量银行流水'};
const companySources=new Map([["广州澜森跨境电商有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["深圳市树简新科技有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["潮州市鲸鸣卫浴有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["深圳昭远洛通贸易有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["深圳市安恒劳保制品有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["九曜聚客（深圳）品牌管理有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["潮州市禾舸贸易有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["许昌勇玖二手车销售有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["深圳市铳纮商贸有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["深圳舒洁净商贸有限公司", ["天眼查企业名录", "https://top.tianyancha.com/"]], ["孩子王儿童用品股份有限公司", ["天眼查收录的招股说明书", "https://stock.tianyancha.com/Announcement/eastmoney/6053180ad111d150407324d912fe944e.pdf"]], ["杭州贝咖实业有限公司", ["天眼查收录的招股说明书", "https://stock.tianyancha.com/Announcement/eastmoney/6053180ad111d150407324d912fe944e.pdf"]], ["子初贸易（上海）有限公司", ["天眼查收录的招股说明书", "https://stock.tianyancha.com/Announcement/eastmoney/6053180ad111d150407324d912fe944e.pdf"]], ["浙江优全护理用品科技股份有限公司", ["天眼查收录的企业标准", "https://static1.tianyancha.com/czd_file/fs/68e2006d-abc6-41f8-8ae6-9702e5524c45.pdf"]], ["宁波妈咪宝婴童用品制造有限公司", ["行业协会团体标准", "https://tuoaitang.oss-cn-hangzhou.aliyuncs.com/nbtjpa.cn/2016/1101/20161101114522523.pdf"]], ["麦克英孚（宁波）婴童用品有限公司", ["行业协会团体标准", "https://tuoaitang.oss-cn-hangzhou.aliyuncs.com/nbtjpa.cn/2016/1101/20161101114522523.pdf"]], ["宁波博林日用品制造有限公司", ["行业协会团体标准", "https://tuoaitang.oss-cn-hangzhou.aliyuncs.com/nbtjpa.cn/2016/1101/20161101114522523.pdf"]], ["浙江瑞翔婴童用品有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["贝亲母婴用品（上海）有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["山东省药用玻璃股份有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["安徽德力日用玻璃有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["哈琪森商贸（上海）有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["浙江日康婴儿用品有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["厦门帝尔特企业有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["东莞市希贝实业有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["上海阿里宝宝婴儿用品有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["飞利浦（中国）投资有限公司", ["奶瓶标准起草单位", "https://www.cirs-group.com/files/attach/uploads/soft/150706/babybottle.pdf"]], ["上海优生婴儿用品有限公司", ["市场监管局抽查名单", "https://scjgj.sh.gov.cn/923/20221103/2c984a728435b77f01843c035d6b24eb.html"]], ["上海贝儿康婴童用品有限公司", ["市场监管局抽查名单", "https://scjgj.sh.gov.cn/923/20221103/2c984a728435b77f01843c035d6b24eb.html"]], ["上海爱婴室商务服务股份有限公司", ["发行人募集说明书", "https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=8872944&stockid=301078"]], ["广东爱婴岛儿童百货股份有限公司", ["发行人募集说明书", "https://money.finance.sina.com.cn/corp/view/vCB_AllBulletinDetail.php?id=8872944&stockid=301078"]]]);
const prospectus='https://stock.tianyancha.com/Announcement/eastmoney/6053180ad111d150407324d912fe944e.pdf';
for(const name of ['上海优壹电子商务有限公司','惠氏（上海）贸易有限公司','健合（中国）有限公司','深圳市怡亚通供应链股份有限公司','南京欣荣保健食品有限公司','得顺护理用品（上海）有限公司','菲仕兰食品贸易（上海）有限公司','成都东万丰贸易发展有限公司','花王（上海）产品服务有限公司']){
 companySources.set(name,['天眼查收录的招股说明书',prospectus]);
}
for(const [name,url] of [
 ['华耐空间（天津）科技有限公司','https://m.tianyancha.com/company/3049460766'],
 ['佛山市宝纳斯家具有限公司','https://m.tianyancha.com/company/2963690425'],
 ['兆隆康源（山西）生物科技有限公司','https://m.tianyancha.com/brand/b4e0f203002'],
 ['曲美家具集团股份有限公司','https://stock.tianyancha.com/Announcement/eastmoney/0e1b83f9c43502e4f808f0be379d0aaf.pdf']
])companySources.set(name,['天眼查公开资料',url]);
const publicCompanyList=["\u4e2d\u56fd\u5efa\u6750\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u8239\u8236\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6e56\u5357\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u656c\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u822a\u7a7a\u6cb9\u6599\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u673a\u68b0\u5de5\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7acb\u8baf\u7cbe\u5bc6\u5de5\u4e1a\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u7701\u4ea4\u901a\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u8fbd\u5b81\u65b9\u5927\u96c6\u56e2\u5b9e\u4e1a\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u592a\u5e73\u6d0b\u4fdd\u9669\uff08\u96c6\u56e2\uff09\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5929\u80fd\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u534e\u7535\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5b89\u5fbd\u6d77\u87ba\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u4e2d\u56fd\u6c11\u751f\u94f6\u884c\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u73e0\u6d77\u683c\u529b\u7535\u5668\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6f4d\u67f4\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u5efa\u5de5\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6d77\u4fe1\u96c6\u56e2\u63a7\u80a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u5dde\u5e02\u5efa\u7b51\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u5316\u5b66\u5de5\u7a0b\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7d2b\u91d1\u77ff\u4e1a\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u590d\u661f\u56fd\u9645\u6709\u9650\u516c\u53f8","\u6df1\u5733\u5e02\u6295\u8d44\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u5180\u5357\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u7535\u5b50\u4fe1\u606f\u4ea7\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u957f\u57ce\u6c7d\u8f66\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u8700\u9053\u6295\u8d44\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u6d59\u5b89\u5316\u5de5\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u4e2d\u7164\u80fd\u6e90\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e91\u5357\u7701\u5efa\u8bbe\u6295\u8d44\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u94dc\u9675\u6709\u8272\u91d1\u5c5e\u96c6\u56e2\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u91cd\u578b\u6c7d\u8f66\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u5fb7\u9f99\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u7701\u80fd\u6e90\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5317\u4eac\u5efa\u9f99\u91cd\u5de5\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6cb3\u5317\u6d25\u897f\u94a2\u94c1\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u9655\u897f\u5efa\u5de5\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65b0\u7586\u4e2d\u6cf0\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u901a\u5a01\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5317\u4eac\u9996\u519c\u98df\u54c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5353\u5c14\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u5b9e\u4e1a\u63a7\u80a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6b63\u6cf0\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5929\u6d25\u8363\u7a0b\u7965\u6cf0\u6295\u8d44\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5317\u4eac\u57ce\u5efa\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u6cb3\u5357\u80fd\u6e90\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u7701\u6e2f\u53e3\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u795e\u5dde\u6570\u7801\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u7518\u8083\u7701\u516c\u8def\u822a\u7a7a\u65c5\u6e38\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e09\u4e00\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65e0\u9521\u4ea7\u4e1a\u53d1\u5c55\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6676\u79d1\u80fd\u6e90\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u7701\u5174\u5408\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5185\u8499\u53e4\u7535\u529b\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u4e2d\u56fd\u5e7f\u6838\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e91\u5357\u7701\u80fd\u6e90\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u82cf\u94f6\u884c\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u4e1c\u6d77\u5927\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u4f20\u5316\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6cb3\u5357\u4ea4\u901a\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65b0\u5965\u5929\u7136\u6c14\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u7267\u539f\u5b9e\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u7535\u6c14\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u9752\u5c9b\u6d77\u53d1\u56fd\u6709\u8d44\u672c\u6295\u8d44\u8fd0\u8425\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5b81\u6ce2\u91d1\u7530\u6295\u8d44\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u798f\u5efa\u5927\u4e1c\u6d77\u5b9e\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u897f\u5efa\u8bbe\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5929\u5408\u5149\u80fd\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u56fd\u9645\u822a\u7a7a\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5305\u5934\u94a2\u94c1\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u4e2d\u5929\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u94f6\u884c\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6d77\u6f9c\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u94c3\u6c7d\u8f66\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u4e1c\u65b9\u822a\u7a7a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u56db\u5ddd\u534e\u897f\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6cb3\u5317\u666e\u9633\u94a2\u94c1\u6709\u9650\u516c\u53f8","\u65b0\u51e4\u9e23\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u5747\u548c\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e91\u8d26\u6237\u6280\u672f\uff08\u5929\u6d25\uff09\u6709\u9650\u516c\u53f8","\u767e\u5ea6\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u67f3\u5dde\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e07\u8fbe\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6e56\u5317\u4ea4\u901a\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5149\u660e\u98df\u54c1\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u5c71\u897f\u9e4f\u98de\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5317\u4eac\u5efa\u5de5\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u6c5f\u82cf\u4ea4\u901a\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u9686\u57fa\u7eff\u80fd\u79d1\u6280\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u7f51\u6613\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5317\u4eac\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u5929\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u6709\u8272\u77ff\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u53a6\u95e8\u8def\u6865\u5de5\u7a0b\u7269\u8d44\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u56fd\u9645\u6d77\u8fd0\u96c6\u88c5\u7bb1\uff08\u96c6\u56e2\uff09\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5317\u4eac\u80fd\u6e90\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5e7f\u4e1c\u7701\u5e7f\u665f\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5f90\u5dde\u5de5\u7a0b\u673a\u68b0\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5185\u8499\u53e4\u4f0a\u5229\u5b9e\u4e1a\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u5317\u90e8\u6e7e\u56fd\u9645\u6e2f\u52a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u57fa\u5b81\u6ce2\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u65b0\u7586\u7279\u53d8\u7535\u5de5\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5e7f\u5dde\u8d8a\u79c0\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u65e5\u7167\u94a2\u94c1\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u82cf\u65b0\u957f\u6c5f\u5b9e\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6df1\u5733\u5e02\u7acb\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d6a\u6f6e\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u82cf\u60a6\u8fbe\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6e56\u5317\u8054\u6295\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u8363\u8000\u7ec8\u7aef\u6709\u9650\u516c\u53f8","\u8fdc\u666f\u80fd\u6e90\u6709\u9650\u516c\u53f8","\u65b9\u5411\u821f\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u4e2d\u666f\u77f3\u5316\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u7701\u56fd\u9645\u8d38\u6613\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u91cd\u836f\u63a7\u80a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u4e2d\u5929\u79d1\u6280\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u57ce\u5efa\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u6cb3\u5317\u592a\u884c\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6052\u4fe1\u6c7d\u8f66\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5b89\u5fbd\u5efa\u5de5\u96c6\u56e2\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u4e09\u623f\u5df7\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5357\u4eac\u94f6\u884c\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u5317\u90e8\u6e7e\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u7701\u5efa\u8bbe\u6295\u8d44\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u9633\u5149\u4fdd\u9669\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6df1\u5733\u5e02\u7231\u65bd\u5fb7\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u8d1d\u58f3\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u4e91\u5929\u5316\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u8fdc\u5927\u7269\u4ea7\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5f18\u6da6\u77f3\u5316\uff08\u6f4d\u574a\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u9f50\u6210\uff08\u5c71\u4e1c\uff09\u77f3\u5316\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u56db\u5ddd\u7701\u80fd\u6e90\u6295\u8d44\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u534e\u6cf0\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6e29\u6c0f\u98df\u54c1\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u4e1c\u65b9\u56fd\u9645\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u5929\u6d25\u6cf0\u8fbe\u6295\u8d44\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u5b81\u6ce2\u5bcc\u90a6\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u4e1c\u535a\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u519c\u4e1a\u751f\u4ea7\u8d44\u6599\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7518\u8083\u7701\u5efa\u8bbe\u6295\u8d44\uff08\u63a7\u80a1\uff09\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e1c\u65b9\u6da6\u5b89\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6052\u7533\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u5bff\u5149\u9c81\u6e05\u77f3\u5316\u6709\u9650\u516c\u53f8","\u767d\u94f6\u6709\u8272\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6cb3\u5317\u7701\u7269\u6d41\u4ea7\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5e7f\u4e1c\u7701\u5e7f\u7269\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7396\u9f99\u7eb8\u4e1a\uff08\u63a7\u80a1\uff09\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u95fd\u8def\u6da6\u8d38\u6613\u6709\u9650\u516c\u53f8","\u6cb3\u5317\u65b0\u91d1\u94a2\u94c1\u6709\u9650\u516c\u53f8","\u53cc\u80de\u80ce\uff08\u96c6\u56e2\uff09\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u6d77\u79d1\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u5f00\u6ee6\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5c71\u4e1c\u91d1\u8bda\u77f3\u5316\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u94a2\u8054\u7535\u5b50\u5546\u52a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u521b\u65b0\u91d1\u5c5e\u79d1\u6280\u6709\u9650\u516c\u53f8","\u56db\u5ddd\u7701\u5ddd\u5a01\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5176\u4e9a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u534e\u52e4\u6280\u672f\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u7ea2\u72ee\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e91\u5357\u7701\u4ea4\u901a\u6295\u8d44\u5efa\u8bbe\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u9633\u5149\u7535\u6e90\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6b66\u5b89\u5e02\u88d5\u534e\u94a2\u94c1\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u592a\u9633\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5170\u5dde\u65b0\u533a\u5546\u8d38\u7269\u6d41\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u9655\u897f\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u676d\u5dde\u5e02\u57ce\u5e02\u5efa\u8bbe\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5f18\u9633\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5e7f\u4e1c\u7701\u80fd\u6e90\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65b0\u534e\u4eba\u5bff\u4fdd\u9669\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6c38\u8363\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u8001\u51e4\u7965\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6676\u6fb3\u592a\u9633\u80fd\u79d1\u6280\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5510\u5c71\u6e2f\u9646\u94a2\u94c1\u6709\u9650\u516c\u53f8","\u592a\u5e73\u4eba\u5bff\u4fdd\u9669\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u9f50\u6da6\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6dee\u5317\u77ff\u4e1a\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u6749\u6749\u63a7\u80a1\u6709\u9650\u516c\u53f8","\u676d\u5dde\u9526\u6c5f\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65b0\u4f59\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e09\u6cb3\u6c47\u798f\u7cae\u6cb9\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u95fd\u6cf0\u79d1\u6280\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6c34\u53d1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u8363\u76db\u63a7\u80a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u521b\u7ef4\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u56db\u5ddd\u516c\u8def\u6865\u6881\u5efa\u8bbe\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6e24\u6d77\u94f6\u884c\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5174\u534e\u8d22\u5bcc\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5929\u6d25\u53cb\u53d1\u94a2\u7ba1\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5b89\u5fbd\u7701\u4ea4\u901a\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5b9c\u660c\u5174\u53d1\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5185\u8499\u53e4\u9102\u5c14\u591a\u65af\u6295\u8d44\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u534e\u52e4\u6a61\u80f6\u5de5\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u56db\u5ddd\u7701\u6e2f\u822a\u6295\u8d44\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5f6c\u53bf\u7164\u70ad\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u9655\u897f\u4ea4\u901a\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u5357\u4e39\u5357\u65b9\u91d1\u5c5e\u6709\u9650\u516c\u53f8","\u5e7f\u897f\u4ea4\u901a\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6df1\u5733\u91d1\u96c5\u798f\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u56fd\u4e1c\u65b9\u7535\u6c14\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6cb3\u5357\u53cc\u6c47\u6295\u8d44\u53d1\u5c55\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5b81\u590f\u5929\u5143\u9530\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u897f\u90e8\u77ff\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u534e\u53cb\u94b4\u4e1a\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5317\u4eac\u6c5f\u5357\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6cb3\u5357\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d4e\u94a2\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e0a\u6d77\u534e\u8c0a\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7533\u80fd\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u632f\u77f3\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5927\u534e\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u6d1b\u9633\u56fd\u5b8f\u6295\u8d44\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u82cf\u56fd\u6cf0\u56fd\u9645\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6e56\u5357\u535a\u957f\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5357\u4eac\u65b0\u5de5\u6295\u8d44\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5e7f\u5dde\u4ea7\u4e1a\u6295\u8d44\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u4e1c\u5357\u7f51\u67b6\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u77f3\u6a2a\u7279\u94a2\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u9655\u897f\u6c7d\u8f66\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u676d\u5dde\u4e1c\u6052\u77f3\u6cb9\u6709\u9650\u516c\u53f8","\u4e2d\u534e\u8054\u5408\u4fdd\u9669\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u4e09\u82b1\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e09\u5b9d\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5706\u901a\u901f\u9012\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u6b66\u6c49\u57ce\u5e02\u5efa\u8bbe\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5317\u4eac\u9996\u90fd\u521b\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u897f\u5efa\u90a6\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u7269\u7f8e\u79d1\u6280\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5927\u6c49\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u5347\u534e\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u798f\u5dde\u57ce\u5e02\u5efa\u8bbe\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6c5f\u82cf\u9633\u5149\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5357\u901a\u56db\u5efa\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u91cd\u5e86\u65b0\u9e25\u9e4f\u4f01\u4e1a\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u6c38\u9053\u63a7\u80a1\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5e7f\u4e1c\u7701\u4ea4\u901a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u897f\u664b\u57ce\u94a2\u94c1\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u6d59\u6c5f\u4e2d\u6210\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u91d1\u5cad\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u4e2d\u94c1\u96c6\u88c5\u7bb1\u8fd0\u8f93\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u6df1\u5733\u4f20\u97f3\u63a7\u80a1\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u5b81\u6ce2\u5f00\u53d1\u6295\u8d44\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u9c81\u4e3d\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5929\u6d25\u6e24\u6d77\u5316\u5de5\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5c71\u4e1c\u6e24\u6d77\u5b9e\u4e1a\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u897f\u664b\u5357\u94a2\u94c1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u5c71\u4e1c\u661f\u5229\u77f3\u5316\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u798f\u5efa\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u65b0\u7586\u751f\u4ea7\u5efa\u8bbe\u5175\u56e2\u5efa\u8bbe\u5de5\u7a0b\uff08\u96c6\u56e2\uff09\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5367\u9f99\u63a7\u80a1\u96c6\u56e2\u6709\u9650\u516c\u53f8","\u91cd\u5e86\u5e02\u535a\u8d5b\u77ff\u4e1a\uff08\u96c6\u56e2\uff09\u6709\u9650\u516c\u53f8","\u6df1\u5733\u6d77\u738b\u96c6\u56e2\u80a1\u4efd\u6709\u9650\u516c\u53f8","\u80dc\u661f\u96c6\u56e2\u6709\u9650\u8d23\u4efb\u516c\u53f8","\u5f90\u5dde\u77ff\u52a1\u96c6\u56e2\u6709\u9650\u516c\u53f8"];
for(const name of publicCompanyList)if(!companySources.has(name)){
 companySources.set(name,['中国企业联合会公开名录','https://www.cec1979.org.cn/group1/M00/00/35/rBUAA2fuI-yAKWrlAOfj0Y9q9ZM754.pdf']);
}
const blacklist=["天津盛相电子有限公司", "河北毅昌科技有限公司", "上海仪电物联技术股份有限公司", "上海中卡智能卡有限公司", "中京复电（上海）电子科技有限公司", "上海鸿仪通信息技术有限公司", "杭州星强化工原料有限公司", "中兴发展有限公司", "安徽海聚玖力电子有限公司", "南昌与德通讯技术有限公司", "深圳龙腾飞通讯装备技术有限公司", "深圳和誉国际供应链有限公司", "深圳兴飞科技有限公司", "台州耀德塑业有限公司", "台州市浩德电子科技有限公司", "台州奥利棽电子有限公司", "温岭市江连塑料厂（普通合伙）", "江阴绿澄化工科技有限公司", "江苏环宇生态旅游服务有限公司", "江苏凯斯奇能源科技有限公司", "上海谋盛资产管理有限公司", "句容南大置业有限公司", "泰州建盈电力科技有限公司", "南京鹏大科技发展有限公司", "江苏鸿信商贸发展有限公司", "廊坊市钦纵机电产品制造有限公司", "宜昌唐鼎机械有限公司", "杭州蓝拓机电设备有限公司", "杭州龙基轴承有限公司", "浙江华景宏物资贸易有限公司", "内蒙古锦联铝材有限公司", "镇江市宏业科技有限公司", "团风县鑫旺药业有限公司", "武汉日月新保健食品有限公司", "太原市圣地雅矿用设备有限公司", "山西天欣意矿业发展有限公司", "河北冠瑞贸易有限公司", "华讯方舟科技有限公司", "华讯方舟科技(湖北)有限公司", "深圳市华讯方舟卫星通信有限公司", "上海缘信电子科技有限公司", "宁波汇金劳务发展有限公司", "宁波和昌市政园林建设有限公司", "深圳德福商业保理有限公司", "深圳市百盛易威科技有限公司", "黑龙江黑科恒泊汉麻科技有限公司", "鄯善阿信商贸有限公司", "吐鲁番思北投资有限公司", "喀什宏腾达物业服务有限公司", "新疆宏晟置业有限公司", "临沂凡高农资销售有限公司"];
const copy=x=>JSON.parse(JSON.stringify(x));const cents=x=>Math.round(Number(x||0)*100),money=x=>x/100;
const DEFAULT_FX=7;
const currencyCode=v=>String(v??'').trim().toUpperCase();
const rmbRate=(r,fx)=>{
 const code=currencyCode(r[7]);
 if(code==='CNY'||code==='RMB')return 1;
 const rate=typeof fx==='number'?(code==='USD'?fx:null):fx?.[code];
 return Number.isFinite(rate)&&rate>0?rate:null;
};
function rmbCents(r,index,fx=DEFAULT_FX){
 if(fx?.original)return cents(r[index]);
 const rate=rmbRate(r,fx);
 return rate===null?cents(r[index+1]):Math.round(cents(r[index])*rate);
}
function convertRow(r,fx=DEFAULT_FX){
 if(rmbRate(r,fx)!==null)for(const i of [8,10,12])r[i+1]=money(rmbCents(r,i,fx));
 return r;
}
const key=(...s)=>s.map(v=>String(v??'').trim()).join('\u001f');const day=s=>String(s||'').slice(0,10);const year=s=>Number(day(s).slice(0,4));
function rng(seed){let h=2166136261;for(const c of String(seed))h=Math.imul(h^c.charCodeAt(0),16777619);return()=>{h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function dates(s,e){const a=[];for(let t=Date.parse(s+'T00:00:00Z');t<=Date.parse(e+'T00:00:00Z');t+=86400000)a.push(new Date(t).toISOString().slice(0,10));return a;}
// The related-party template has no entity-type column. Recognize personal names with an explicit management relationship.
const isRelatedOfficer=(name,role)=>/^(?:[\p{Script=Han}]{2,4}|[\p{Script=Han}]+(?:[·・][\p{Script=Han}]+)+)$/u.test(String(name??'').trim())&&/^(?:董事|监事|高管|高级管理人员|董监高|董事长|独立董事|执行董事|非执行董事|监事会主席|总经理|副总经理|财务负责人|董事会秘书)$/.test(String(role??'').trim());
function counterpartyCategories(d){
 const customers=new Set(d[KEYS.customer].rows.map(r=>String(r[2]??'').trim()).filter(Boolean));
 const suppliers=new Set(d[KEYS.supplier].rows.map(r=>String(r[2]??'').trim()).filter(Boolean));
 return new Map([...new Set([...customers,...suppliers])].map(name=>[name,customers.has(name)&&suppliers.has(name)?'客商一体':customers.has(name)?'客户':'供应商']));
}
function counterpartyRelationships(d){
 const names=new Map();
 for(const row of d[KEYS.related].rows){const name=String(row[1]??'').trim();if(!name)continue;if(!names.has(name))names.set(name,new Set());const role=String(row[2]??'').trim();if(role)names.get(name).add(role);}
 return new Map([...names].map(([name,roles])=>[name,roles.size?[...roles].sort((a,b)=>a.localeCompare(b,'zh-CN')).join('、'):'其他']));
}
function indexes(d){const own=new Set(d[KEYS.company].rows.map(r=>r[0]).filter(Boolean));const customers=new Map(d[KEYS.customer].rows.filter(r=>r[0]&&r[2]).map(r=>[key(r[0],r[2]),r]));const suppliers=new Map(d[KEYS.supplier].rows.filter(r=>r[0]&&r[2]).map(r=>[key(r[0],r[2]),r]));const related=new Map(d[KEYS.related].rows.filter(r=>r[0]&&r[1]).map(r=>[key(r[0],r[1]),r[2]]));const employees=new Map(d[KEYS.employee].rows.filter(r=>r[0]&&r[2]).map(r=>[key(r[0],r[2]),r]));return{own,customers,suppliers,related,employees};}
function annotate(d){const ix=indexes(d);for(const r of d[KEYS.flow].rows){const k=key(r[0],r[3]),c=ix.customers.get(k),s=ix.suppliers.get(k),e=ix.employees.get(k);r[18]=ix.related.get(k)||null;r[20]=ix.own.has(r[3])?'被审计单位':c&&s?'客商一体':c?'客户':s?'供应商':e?'员工':r[3]&&String(r[3]).length<=4?'个人':'其他';r[21]=c?.[5]||null;r[22]=s?.[5]||null;r[23]=e?.[3]||null;r[24]=c?.[7]||null;r[25]=c?.[8]||null;r[26]=s?.[7]||null;r[27]=s?.[8]||null;r[28]=e?.[4]||null;r[29]=e?.[5]||null;}return d;}
function rename(d,pairs){const active=pairs.filter(([a,b])=>a&&b&&a!==b);const current=d[KEYS.company].rows.map(r=>r[0]).filter(Boolean);const after=current.map(n=>active.find(p=>p[0]===n)?.[1]||n);if(new Set(after).size!==after.length)throw Error('替换后的被审计单位名称不能重复。');for(const t of Object.values(d))for(const r of t.rows)for(let j=0;j<r.length;j++){if(typeof r[j]!=='string')continue;const hit=active.find(p=>p[0]===r[j]);if(hit)r[j]=hit[1];}return d;}
function validate(d){const errors=[],warnings=[];for(const k of Object.values(KEYS))if(!d[k]||!Array.isArray(d[k].rows)||!Array.isArray(d[k].headers))errors.push('缺少文件：'+k);if(errors.length)return{errors,warnings};const ix=indexes(d),ids=new Set();for(const [i,r]of d[KEYS.flow].rows.entries()){if(!r[0]||!r[1])errors.push('流水第'+(i+2)+'行缺少本方名称或账号');if(!ix.own.has(r[0]))warnings.push('流水第'+(i+2)+'行本方名称未列入主档');if(!/^\d{4}-\d{2}-\d{2}$/.test(day(r[5]))||!Number.isFinite(Date.parse(day(r[5]))))errors.push('流水第'+(i+2)+'行日期无效');if(!/^[A-Z]{3}$/.test(currencyCode(r[7])))warnings.push('流水第'+(i+2)+'行币种为'+r[7]);for(const j of [8,9,10,11,12,13])if(!Number.isFinite(Number(r[j]||0)))errors.push('流水第'+(i+2)+'行金额不是数字');if(Number(r[8])<0||Number(r[10])<0)errors.push('流水第'+(i+2)+'行流入/流出小于0');if(r[15]&&ids.has(r[15]))warnings.push('重复流水号：'+r[15]);ids.add(r[15]);}for(const k of ['company','bank','customer','supplier','employee','related'])for(const [i,r]of d[KEYS[k]].rows.entries())for(let j=0;j<d[KEYS[k]].headers.length;j++)if(String(d[KEYS[k]].headers[j]).includes('*')&&(r[j]===null||r[j]===undefined||String(r[j]).trim()===''))warnings.push(KEYS[k]+'第'+(i+2)+'行缺少'+d[KEYS[k]].headers[j]);return{errors:[...new Set(errors)],warnings:[...new Set(warnings)]};}
function previewFlowRows(table,{filters={},sort=null,query=''}={}){
 const {from,to,company,account,currency,direction,type,counterparty}=filters;
 const needle=query.trim().toLowerCase();
 const includes=(filter,value)=>Array.isArray(filter)?filter.includes(value):!filter||filter===value;
 const matches=table.rows.map((r,i)=>({r,i})).filter(({r})=>
  (!from||day(r[5])>=from)&&(!to||day(r[5])<=to)&&
  includes(company,r[0])&&includes(account,String(r[1]))&&
  includes(currency,r[7])&&includes(type,r[20])&&
  (!counterparty||String(r[3]??'').toLowerCase().includes(counterparty.trim().toLowerCase()))&&
  (!direction||includes(direction,'in')&&cents(r[8])>0||includes(direction,'out')&&cents(r[10])>0)&&
  (!needle||r.some(v=>String(v??'').toLowerCase().includes(needle)))
 );
 if(!sort)return matches;
 const {column,descending}=sort,sign=descending?-1:1;
 const numeric=/金额|余额/.test(table.headers[column]||'');
 const blank=v=>v===null||v===undefined||v==='';
 return matches.sort((a,b)=>{
  const x=a.r[column],y=b.r[column];
  if(blank(x)||blank(y))return Number(blank(x))-Number(blank(y))||a.i-b.i;
  const compare=numeric?Number(x)-Number(y):String(x).localeCompare(String(y),'zh-CN');
  const time=column===5?String(a.r[6]??'').localeCompare(String(b.r[6]??'')):0;
  return sign*(compare||time)||a.i-b.i;
 });
}
function accountList(d){const map=new Map();for(const r of d[KEYS.flow].rows)if(r[0]&&r[1])map.set(key(r[0],r[1]),{name:r[0],account:String(r[1]),bank:r[2],currency:r[7]||'CNY'});return [...map.values()];}
function generationAccounts(d,c){
 const own=new Set(d[KEYS.company].rows.map(r=>r[0]).filter(Boolean));
 const existing=accountList(d).filter(a=>own.has(a.name));
 const accountPlans=Object.values(c.sampleAccountPlans||{}).flat().filter(a=>own.has(a.name));
 const excluded=new Set(accountPlans.filter(a=>!a.flow).map(a=>key(a.name,a.account)));
 const planned=accountPlans.filter(a=>a.flow);
 const active=new Set([...existing,...planned].map(a=>a.name));
 const configured=name=>Object.hasOwn(c.companyFlow||{},name)?c.companyFlow[name]:undefined;
 const bank=d[KEYS.bank].rows.filter(r=>r[0]&&own.has(r[2]))
  .map(r=>({name:r[2],account:String(r[0]),bank:r[1],currency:r[4]||'CNY'}));
 const seen=new Set(existing.map(a=>key(a.name,a.account)));
 const combined=[...existing];
 for(const a of [...bank,...planned]){
  const k=key(a.name,a.account);
  if(!seen.has(k)){seen.add(k);combined.push(a);}
 }
 for(const name of own)if(configured(name)===true&&!combined.some(a=>a.name===name&&!excluded.has(key(a.name,a.account)))){
  throw Error(name+' 已设为生成流水，请先新增银行账号。');
 }
 return combined.filter(a=>!excluded.has(key(a.name,a.account))&&(configured(a.name)??(!c.missingCompany||active.has(a.name)||!existing.length))&&(c.includeForeign!==false||['CNY','RMB'].includes(currencyCode(a.currency))));
}
function addCompany(d,{name,role,count=0}){
 name=String(name??'').trim();role=String(role??'').trim();
 if(!name||!role)throw Error('请填写公司名称和公司职能。');
 if(d[KEYS.company].rows.some(r=>r[0]===name))throw Error('被审计单位名称已存在。');
 if(!Number.isInteger(count)||count<0||count>50)throw Error('模拟账号数须为 0 至 50 的整数。');
 const used=new Set([...d[KEYS.bank].rows.map(r=>String(r[0])),...d[KEYS.balance].rows.map(r=>String(r[1])),...d[KEYS.flow].rows.flatMap(r=>[String(r[1]),String(r[4])])]);
 const banks=['中国工商银行股份有限公司','中国建设银行股份有限公司','招商银行股份有限公司','中国银行股份有限公司','中信银行股份有限公司','中国农业银行股份有限公司'];
 const company=Array(d[KEYS.company].headers.length).fill(null);
 company[0]=name;company[3]=role;
 d[KEYS.company].rows.push(company);
 let serial=1;
 for(let i=0;i<count;i++){
  let account;
  do{account='99098'+String(serial++).padStart(14,'0');}while(used.has(account));
  used.add(account);
  d[KEYS.bank].rows.push([account,banks[(i+d[KEYS.company].rows.length-1)%banks.length],name,null,'CNY',null,null,null,null]);
 }
 return d;
}
function companyGroups(){return copy(g.AuditCompanyGroups||[]);}
function companyCatalog(){
 const names=new Map(companySources);
 for(const group of g.AuditCompanyGroups||[])for(const member of group.members)if(!names.has(member.name))names.set(member.name,[group.source,group.url]);
 return [...names].map(([name,[source,url]])=>[name,source,url]);
}
function availableCompanyGroups(source,excludeNames=[]){
 const used=new Set([...excludeNames,...blacklist]);
 for(const [key,columns] of [[KEYS.company,[0]],[KEYS.bank,[2]],[KEYS.related,[0,1]],[KEYS.customer,[0,2]],[KEYS.supplier,[0,2]],[KEYS.employee,[0,2]],[KEYS.flow,[0,3]],[KEYS.gl,[0]],[KEYS.balance,[0]]])for(const row of source[key]?.rows||[])for(const col of columns)if(row[col])used.add(row[col]);
 return companyGroups().map(group=>({...group,available:group.members.filter(member=>!used.has(member.name))}));
}
// Opt-in, append-only company generation; existing project rows are never rewritten.
function randomCompanies(source,options={}){
 const {count=3,mode='real',seed='AC-COMPANIES',accounts=0,role='子公司',excludeNames=[],reservedAccounts=[],groupId=''}=options;
 const maxCount=groupId?100:20;
 if(!Number.isInteger(count)||count<1||count>maxCount)throw Error('生成公司数须为 1 至 '+maxCount+' 的整数。');
 if(!Number.isInteger(accounts)||accounts<0||accounts>10)throw Error('每家公司账号数须为 0 至 10 的整数。');
 if(!['real','fictional','mixed'].includes(mode))throw Error('请选择企业名称来源。');
 const used=new Set([...Object.values(source).flatMap(t=>t.rows.flat().filter(v=>typeof v==='string')),...excludeNames,...blacklist]);
 const realCount=mode==='real'?count:mode==='mixed'?Math.ceil(count/2):0;
 let picks=[];
 if(groupId&&realCount){
  const groups=availableCompanyGroups(source,excludeNames);
  const group=groupId==='auto'?seededShuffle(groups.filter(group=>group.available.length>=realCount),seed+'/group')[0]:groups.find(group=>group.id===groupId);
  if(!group)throw Error('没有足够可用成员的集团，请减少公司数或选择其他集团。');
  if(group.available.length<realCount)throw Error(group.label+' 可新增 '+group.available.length+' 家，本次需要 '+realCount+' 家。请减少数量或点“整组预览”。');
  const parent=group.available.find(member=>member.name===group.parent);
  const members=[...(parent?[parent]:[]),...seededShuffle(group.available.filter(member=>member!==parent),seed+'/members')].slice(0,realCount);
  picks=members.map(member=>({...member,type:'真实企业名称',source:group.source,url:group.url,group:group.label,industry:group.industry}));
 }else{
  const real=seededShuffle(companyCatalog().filter(([name])=>!used.has(name)),seed+'/real').slice(0,realCount);
  if(real.length<realCount)throw Error('可用真实企业名称不足，请减少数量或切换虚构名称。');
  picks=real.map(([name,source,url])=>({name,type:'真实企业名称',source,url}));
 }
 const random=rng(seed+'/fictional');
 const cities=['上海','杭州','宁波','苏州','成都','广州','武汉','南京'],words=['澄岚','云栖','知沐','星禾','锦川','远棠','青屿','沐辰'],industries=['科技','商贸','供应链','电子商务','信息技术','实业'];
 let serial=1;
 while(picks.length<count){const name='测试专用'+cities[Math.floor(random()*cities.length)]+words[Math.floor(random()*words.length)]+industries[Math.floor(random()*industries.length)]+String(serial++)+'有限公司';if(used.has(name)||companySources.has(name))continue;used.add(name);picks.push({name,type:'虚构企业名称',source:'离线生成',url:''});}
 const next=copy(source),occupied=new Set([...reservedAccounts,...source[KEYS.bank].rows.map(r=>String(r[0])),...source[KEYS.balance].rows.map(r=>String(r[1])),...source[KEYS.flow].rows.flatMap(r=>[String(r[1]),String(r[4])])]);
 const banks=['中国工商银行股份有限公司','招商银行股份有限公司','中国建设银行股份有限公司','中国银行股份有限公司','中信银行股份有限公司'];
 const accountRandom=rng(seed+'/accounts');
 for(const item of picks){
  addCompany(next,{name:item.name,role:item.role||role,count:0});
  const company=next[KEYS.company].rows.at(-1);if(item.parent)company[2]=item.parent;if(item.industry)company[4]=item.industry;
  for(let i=0;i<accounts;i++){let account;do{account='99096'+Array.from({length:14},()=>Math.floor(accountRandom()*10)).join('');}while(occupied.has(account));occupied.add(account);next[KEYS.bank].rows.push([account,banks[Math.floor(accountRandom()*banks.length)],item.name,null,'CNY',null,null,null,null]);}
 }
 return {data:next,companies:picks};
}
const ACCOUNT_GROUPS=[
 ['normalCNY','正常对账 CNY','CNY',true,true,true],
 ['normalUSD','正常对账 USD','USD',true,true,true],
 ['normalCustom','正常对账 自定义币种','',true,true,true],
 ['bankOnly','只有账号主档','CNY',true,false,false],
 ['bookOnly','只有分账号余额表','CNY',false,true,false],
 ['noBook','有主档和流水，缺余额表','CNY',true,false,true],
 ['noMaster','有流水和余额表，缺账号主档','CNY',false,true,true],
 ['flowOnly','只有流水','CNY',false,false,true]
];
function accountSamples(d,companies,options,oldPlans){
 const plans=Object.fromEntries(Object.entries(oldPlans||{}));
 if(!options)return plans;
 const occupied=new Set([
  ...d[KEYS.bank].rows.map(r=>String(r[0])),
  ...d[KEYS.balance].rows.map(r=>String(r[1])),
  ...d[KEYS.flow].rows.flatMap(r=>[String(r[1]),String(r[4])]),
  ...Object.values(plans).flat().map(a=>a.account)
 ]);
 const banks=['招商银行股份有限公司','中国银行股份有限公司','中信银行股份有限公司','中国建设银行股份有限公司','中国工商银行股份有限公司'];
 let serial=1;
 for(const name of new Set(companies)){
  const list=[...(plans[name]||[])];
  for(const [id,label,fixedCurrency,bank,book,flow]of ACCOUNT_GROUPS){
   const currency=fixedCurrency||currencyCode(options.customCurrency);
   const n=options[id]??0;
   if(!Number.isInteger(n)||n<0||n>50)throw Error(label+'的账号数须为 0 至 50 的整数。');
   if(n&&!/^[A-Z]{3}$/.test(currency))throw Error('请选择有效的自定义币种。');
   for(let i=0;i<n;i++){
    let account;
    do{account='99097'+String(serial++).padStart(14,'0');}while(occupied.has(account));
    occupied.add(account);
    const bankName=banks[(serial-2)%banks.length];
    list.push({name,account,bank:bankName,currency,flow,book});
    if(bank)d[KEYS.bank].rows.push([account,bankName,name,null,currency,null,null,null,null]);
   }
  }
  if(list.length)Object.defineProperty(plans,name,{value:list,enumerable:true,writable:true,configurable:true});
 }
 return plans;
}
const MASTER_GROUPS=[['customerOnly','仅客户'],['supplierOnly','仅供应商'],['both','客商重合'],['nonMerchant','非客商']];
const ROLE_OPTIONS=['前员工担任股东或管理层的企业','董事','监事','高管','实际控制人','实际控制人亲属','持股5%以上股东','被审计单位及其控股公司'];
const SCENARIO_PAIRS=[['customerPairs','customerOnly'],['supplierPairs','supplierOnly'],['bothPairs','both'],['nonPairs','nonMerchant'],['relatedPairs','related'],['relatedCustomerPairs','relatedCustomer'],['relatedSupplierPairs','relatedSupplier'],['relatedBothPairs','relatedBoth'],['relatedNonPairs','relatedNon']];
function seededShuffle(items,seed){
 const random=rng(seed),out=[...items];
 for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
 return out;
}
function masterSamples(source,options){
 const {companies,mode='append',seed='AC',counts={},related={},employees=0,officers=0,pools={},preferredNames=[],sourceMode='all',counterpartiesEnabled=true,accounts=null,accountPlans={},linkAudited=false,companyRole='',companyIndustry=''}=options;
 const d=copy(source),ix=indexes(d),nextPools=Object.fromEntries(Object.entries(pools));
 if(!companies.length||companies.some(name=>!ix.own.has(name)))throw Error('请至少选择一家有效的被审计单位。');
 for(const company of new Set(companies)){
  const row=d[KEYS.company].rows.find(r=>r[0]===company);
  if(companyRole.trim())row[3]=companyRole.trim();
  if(companyIndustry.trim())row[4]=companyIndustry.trim();
  if(linkAudited)for(const other of ix.own)if(other!==company&&!ix.related.has(key(company,other)))d[KEYS.related].rows.push([company,other,'被审计单位']);
 }
 const nextAccounts=accountSamples(d,companies,accounts,accountPlans);
 if(!counterpartiesEnabled)return {data:annotate(d),pools:nextPools,accountPlans:nextAccounts,summary:[]};
 const count=(v,label)=>{
  if(!Number.isInteger(v)||v<0||v>200)throw Error(label+'须为 0 至 200 的整数。');
  return v;
 };
 for(const [id,label] of MASTER_GROUPS){
  count(counts[id]??0,label);count(related[id]??0,label+'中的关联方');
  if((related[id]??0)>(counts[id]??0))throw Error(label+'中的关联方家数不能超过该类家数。');
 }
 count(employees,'员工人数');count(officers,'董监高人数');
 const explicitCatalog=new Map(companyCatalog().map(([name,source,url])=>[name,[source,url]]));
 if(preferredNames.some(n=>!explicitCatalog.has(n)))throw Error('指定名称不在离线企业库：'+preferredNames.filter(n=>!explicitCatalog.has(n)).slice(0,3).join('、'));
 const named=new Set([...d[KEYS.employee].rows.map(r=>r[2]),...d[KEYS.related].rows.map(r=>r[1]),...d[KEYS.flow].rows.map(r=>r[3])]);
 const people=seededShuffle([...'严夏乔陆戴傅顾邵沈孟卫袁周许陶闻纪顾'].flatMap(a=>[...'嘉昕宜景知安悦恺思'].flatMap(b=>[...'宁岚禾远航舒彤辰'].map(c=>a+b+c))),seed+'/master-people');
 const nextPerson=()=>{let n;do{n=people.pop();if(!n)throw Error('可用模拟姓名不足，请减少人员数量。');}while(named.has(n));named.add(n);return n;};
 const summary=[];
 for(const company of new Set(companies)){
  const relatedRows=d[KEYS.related].rows;
  if(mode==='replace'){
   for(const k of [KEYS.customer,KEYS.supplier,KEYS.employee])d[k].rows=d[k].rows.filter(r=>r[0]!==company);
   d[KEYS.related].rows=relatedRows.filter(r=>r[0]!==company||ix.own.has(r[1]));
  }
  const used=new Set([...d[KEYS.customer].rows,...d[KEYS.supplier].rows].filter(r=>r[0]===company).map(r=>r[2]));
  for(const r of d[KEYS.related].rows)if(r[0]===company)used.add(r[1]);
  const prior=mode==='replace'?[]:nextPools[company]||[];
  for(const name of prior)used.add(name);
  const available=[...companySources.keys(),...new Set(preferredNames.filter(n=>!companySources.has(n)))].filter(n=>!used.has(n)&&!ix.own.has(n)&&!blacklist.includes(n)&&(sourceMode!=='tyc'||explicitCatalog.get(n)[1].includes('tianyancha.com')));
  const preferred=[...new Set(preferredNames)].filter(n=>available.includes(n));
  const remaining=seededShuffle(available.filter(n=>!preferred.includes(n)),seed+'/'+company);
  const candidates=[...preferred,...remaining.filter(n=>companySources.get(n)[1].includes('tianyancha.com')),...remaining.filter(n=>!companySources.get(n)[1].includes('tianyancha.com'))];
  const total=MASTER_GROUPS.reduce((n,[id])=>n+(counts[id]??0),0);
  if(total>candidates.length)throw Error(company+' 可用企业还剩 '+candidates.length+' 家，本次需要 '+total+' 家。请减少数量或使用重建模式。');
  let idx=0;
  for(const [id,label] of MASTER_GROUPS){
   const subset=candidates.slice(idx,idx+(counts[id]??0));idx+=subset.length;
   for(const [i,name] of subset.entries()){
    if(id==='customerOnly'||id==='both')d[KEYS.customer].rows.push([company,null,name]);
    if(id==='supplierOnly'||id==='both')d[KEYS.supplier].rows.push([company,null,name,null,null,'商品采购及服务']);
    if(i<(related[id]??0))d[KEYS.related].rows.push([company,name,ROLE_OPTIONS[(idx+i)%ROLE_OPTIONS.length]]);
   }
   if(id==='nonMerchant')nextPools[company]=[...prior,...subset];
   summary.push([company,label,subset.length,related[id]??0]);
  }
  for(let i=0;i<employees;i++)d[KEYS.employee].rows.push([company,null,nextPerson(),'普通员工']);
  for(let i=0;i<officers;i++)d[KEYS.related].rows.push([company,nextPerson(),['董事','监事','高管'][i%3]]);
 }
 return {data:annotate(d),pools:nextPools,accountPlans:nextAccounts,summary};
}
function removeCompany(d,name){
 for(const k of Object.values(KEYS)){
  const companyColumn=k===KEYS.bank?2:0;
  d[k].rows=d[k].rows.filter(r=>r[companyColumn]!==name);
 }
 return annotate(d);
}
function generate(source,c){const d=copy(source),ix=indexes(d),fx=c.rates??c.fx??DEFAULT_FX;if(c.start>c.end)throw Error('开始日期不能晚于结束日期。');if(!c.start||!c.end)throw Error('请选择有效的日期范围。');if(c.count<100||c.count>50000)throw Error('流水数量须为100～50000条。');if(c.min<0||c.max<c.min)throw Error('金额上限须不小于下限，金额不能为负。');for(const k of ['count','big','blankCP','blankSummary','balanceErrors','sameTime','sameMissing'])if(!Number.isInteger(c[k])||c[k]<0)throw Error('数量必须是非负整数：'+k);for(const k of ['min','max','opening','growth','internal','bigThreshold'])if(!Number.isFinite(c[k])||c[k]<0)throw Error('金额或比例必须是非负数字：'+k);if(c.internal>80||c.growth>100||c.sameMissing>20)throw Error('内部比例最多80%，年增长最多100%，缺失同名账号最多20个。');const accounts=generationAccounts(d,c);const noRate=[...new Set(accounts.filter(a=>rmbRate({7:a.currency},fx)===null).map(a=>a.currency))];if(noRate.length)throw Error('请先在流水生成规则配置币种汇率：'+noRate.join('、'));if(!accounts.length)throw Error(c.includeForeign===false?'仅人民币模式下没有可用账号。请新增或启用人民币账号，或改为包含外币。':'没有可生成流水的账号。请在「主档管理」启用至少一家有银行账号的被审计单位。');const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;if(!validDate(c.start)||!validDate(c.end))throw Error('请输入有效的开始和结束日期。');if(Date.parse(c.end)-Date.parse(c.start)>=3660*86400000)throw Error('生成区间最多10年。');const days=dates(c.start,c.end);if(days.length>3660)throw Error('生成区间最多10年。');const random=rng(c.seed),pick=a=>a[Math.floor(random()*a.length)];
const takenNames=new Set([...ix.own,...d[KEYS.flow].rows.map(r=>r[3]),...['customer','supplier','employee'].flatMap(k=>d[KEYS[k]].rows.map(r=>r[2])),...d[KEYS.related].rows.map(r=>r[1])].filter(Boolean).map(n=>String(n).trim()));
const personalNames='周 林 陈 沈 许 叶 方 郑 梁 顾 陆 宋 程 唐 徐 吴 王 蒋 罗 韩'.split(' ').flatMap(s=>'佳 嘉 子 文 雨 景 若 亦 舒 芷 思 知 昱 宇'.split(' ').flatMap(m=>'宁 安 晴 瑜 扬 辰 远 禾 悦 航 彤 洁'.split(' ').map(e=>s+m+e)));
const nameRandom=rng(String(c.seed)+"/counterparty-names");
// Keep the personal-name sequence from the prior release.
for(let i=1;i<4320;i++)nameRandom();
for(let i=personalNames.length-1;i>0;i--){const j=Math.floor(nameRandom()*(i+1));[personalNames[i],personalNames[j]]=[personalNames[j],personalNames[i]];}
function nextName(list){for(const n of list)if(!takenNames.has(n)){takenNames.add(n);return n;}throw Error('可用个人姓名不足，请减少个人专项交易数量。');}
const years=[...new Set(days.map(year))];
const blacklistPool=blacklist.filter(name=>!ix.own.has(name));
const annual=(id,i)=>{
 const y=years[i],value=c.annualCounts?.[y]?.[id]??(id==='blacklist'?Math.min(10,blacklistPool.length):id==='employeeRows'?Number(employeeSamples.length>0):id==='officerRows'?Number(officerSamples.length>0):undefined);
 const max=id==='blacklist'?blacklistPool.length:id==='sameMissing'?20:200;
 if(value!==undefined){
  if(!Number.isInteger(value)||value<0||value>max)throw Error(y+' 年 '+(id==='blacklist'?'黑名单家数':'异常数量')+'必须是 0 至 '+max+' 的整数。');
  return value;
 }
 if(id==='once'||id==='person')return c[id]?(c[id+'PerYear']??1):0;
 const relatedPlan=SCENARIO_PAIRS.find(([key,category])=>key===id&&category.startsWith('related')&&category!=='related');
 if(relatedPlan&&c[id]===undefined)return Number(plans[relatedPlan[1]].length>0);
 const n=Math.max(c[id]||0,c[id]?years.length:0);
 return Math.floor(n/years.length)+Number(i<n%years.length);
};
const onceCount=years.reduce((n,_,i)=>n+annual('once',i),0);
const available=[...companySources.keys()].filter(n=>!ix.own.has(n)&&!blacklist.includes(n)&&(c.companySourceMode!=='tyc'||companySources.get(n)[1].includes('tianyancha.com')));
const masterNames=new Set([...ix.customers.values(),...ix.suppliers.values()].map(r=>r[2]));
for(const r of d[KEYS.related].rows)masterNames.add(r[1]);
for(const list of Object.values(c.sampleNonMerchants||{}))for(const n of list)masterNames.add(n);
const oneOffNames=[...available.filter(n=>!masterNames.has(n)).reverse(),...available.filter(n=>masterNames.has(n)).reverse()].slice(0,onceCount);
if(onceCount>=available.length)throw Error('现有真实企业名单不足，请减少各年的单次大额笔数。');
const oldAccounts=new Map(d[KEYS.flow].rows.filter(r=>r[3]&&r[4]).map(r=>[r[3],r[4]]));
const pool=available.filter(n=>!oneOffNames.includes(n)).map((n,i)=>[n,oldAccounts.get(n)||'9958'+String(i+1).padStart(15,'0')]);
let oneOffIndex=0;
const bookKeys=new Set(d[KEYS.balance].rows.map(r=>key(r[0],String(r[1]))));
const masterKeys=new Set(d[KEYS.bank].rows.map(r=>key(r[2],String(r[0]))));
const firstAccountByCompany=new Map(accounts.filter(a=>ix.own.has(a.name)).map(a=>[a.name,a]));
const employeeSamples=d[KEYS.employee].rows.filter(r=>firstAccountByCompany.has(r[0])&&r[2]&&!ix.own.has(r[2])&&!isRelatedOfficer(r[2],ix.related.get(key(r[0],r[2]))));
const officerSamples=d[KEYS.related].rows.filter(r=>firstAccountByCompany.has(r[0])&&isRelatedOfficer(r[1],r[2]));
const plans=Object.fromEntries([...MASTER_GROUPS.map(([id])=>id),'related','relatedCustomer','relatedSupplier','relatedBoth','relatedNon'].map(id=>[id,[]]));
const nameAccount=new Map(pool);
const activeNames=[...firstAccountByCompany.keys()];
for(const company of activeNames){
 const explicitNon=new Set(c.sampleNonMerchants?.[company]||[]);
 for(const name of nameAccount.keys()){
  const k=key(company,name),customer=ix.customers.has(k),supplier=ix.suppliers.has(k),related=ix.related.has(k);
  const category=customer&&supplier?'both':customer?'customerOnly':supplier?'supplierOnly':'nonMerchant';
  const item={a:firstAccountByCompany.get(company),name,account:nameAccount.get(name),related,preferred:explicitNon.has(name)};
  plans[category].push(item);
  if(related)plans.related.push(item);
 }
}
for(const [id,category] of [['relatedCustomer','customerOnly'],['relatedSupplier','supplierOnly'],['relatedBoth','both'],['relatedNon','nonMerchant']])plans[id]=plans[category].filter(x=>x.related);
plans.nonMerchant.sort((a,b)=>Number(b.preferred)-Number(a.preferred));
const internalPair=accounts.map(a=>[a,accounts.find(b=>b.name!==a.name&&b.currency===a.currency)]).find(([,b])=>b);
for(const [i,y]of years.entries()){
 for(const [id,category] of SCENARIO_PAIRS)if(annual(id,i)&&!plans[category].length)throw Error(y+' 年所选场景「'+({relatedCustomer:'客户关联方',relatedSupplier:'供应商关联方',relatedBoth:'客商重合关联方',relatedNon:'非客商关联方'}[category]||category)+'」缺少可用对手方。请在单位主档组合中建立对应关系。');
 if(annual('internalBig',i)&&!internalPair)throw Error(y+' 年范围内大额需要两家有相同币种账号的单位。');
 if(annual('employeeRows',i)&&!employeeSamples.length)throw Error(y+' 年员工场景缺少员工主档。');
 if(annual('officerRows',i)&&!officerSamples.length)throw Error(y+' 年董监高场景缺少关联方人员主档。');
}
const customAccounts=Object.values(c.sampleAccountPlans||{}).flat().filter(a=>ix.own.has(a.name));
const customKeys=new Set(customAccounts.map(a=>key(a.name,a.account)));
const flowOnlyAccounts=accounts.filter(a=>!masterKeys.has(key(a.name,a.account))&&!bookKeys.has(key(a.name,a.account)));
const coverageAccounts=accounts.filter(a=>customKeys.has(key(a.name,a.account))||flowOnlyAccounts.includes(a)||c.companyFlow?.[a.name]===true);
const needed=years.reduce((n,y,i)=>n+annual('big',i)+annual('blankCP',i)+annual('blankSummary',i)+2*(annual('sameTime',i)+annual('sameMissing',i)+annual('balanceErrors',i))+annual('once',i)+annual('person',i)+annual('blacklist',i)+1+annual('employeeRows',i)+annual('officerRows',i)+2*(annual('internalBig',i)+SCENARIO_PAIRS.reduce((m,[id])=>m+annual(id,i),0))+coverageAccounts.length,0);
if(needed>c.count)throw Error('逐年覆盖异常至少需要 '+needed+' 笔流水，请增加总笔数或减少异常设置。');
const rows=[];
const profiles=new Map(),calendar=[];let calendarWeight=0;
for(const date of days){
 const month=date.slice(0,7);
 if(!profiles.has(month))profiles.set(month,{activity:.65+random()*.8,inScale:.6+random()*.4,outScale:.6+random()*.4,inShare:.32+random()*.34});
 const profile=profiles.get(month),weekday=new Date(date+'T00:00:00Z').getUTCDay(),dom=Number(date.slice(8));
 calendarWeight+=profile.activity*([0,6].includes(weekday)?.32:1)*(dom>=25?1.4:1)*(.4+random()*1.2);
 calendar.push({date,profile,weight:calendarWeight,dailyIn:.65+random()*.35,dailyOut:.65+random()*.35});
}
function pickDay(){const weight=random()*calendarWeight;let lo=0,hi=calendar.length-1;while(lo<hi){const mid=(lo+hi)>>1;if(calendar[mid].weight>weight)hi=mid;else lo=mid+1;}return calendar[lo];}
for(let i=0;i<c.count;i++){const a=pick(accounts),entry=pickDay(),dt=entry.date,elapsed=(Date.parse(dt)-Date.parse(c.start))/31557600000;const incoming=random()<entry.profile.inShare;const intensity=incoming?entry.profile.inScale*entry.dailyIn:entry.profile.outScale*entry.dailyOut;const amount=cents((c.min+Math.pow(random(),2)*(c.max-c.min)*intensity)*(1+elapsed*c.growth/100));const cp=pick(pool);const r=Array(30).fill(null);r[0]=a.name;r[1]=a.account;r[2]=a.bank;r[3]=cp[0];r[4]=cp[1];r[5]=dt;r[6]=String(7+Math.floor(random()*15)).padStart(2,'0')+':'+String(Math.floor(random()*60)).padStart(2,'0')+':'+String(Math.floor(random()*60)).padStart(2,'0');r[7]=a.currency;r[8]=incoming?money(amount):0;r[10]=incoming?0:money(amount);r[14]='转账';r[15]='AC'+dt.replaceAll('-','')+String(i+1).padStart(7,'0');r[16]=incoming?pick(['销售回款','往来款收回','服务费结算','客户货款']):pick(['采购货款','物流服务费','业务往来付款','费用结算']);rows.push(r);}
let cursor=0;const force=(r,amount,incoming=true)=>{r[8]=incoming?amount:0;r[10]=incoming?0:amount;};
const annualDates=new Map(years.map(y=>[y,days.filter(dt=>year(dt)===y)]));
const balanceTargets=[];
const occupied=new Set([...accounts.map(a=>a.account),...d[KEYS.bank].rows.map(r=>String(r[0])),...d[KEYS.balance].rows.map(r=>String(r[1])),...rows.map(r=>String(r[4]))]);let nextMissing=1;
function assign(r,a){r[0]=a.name;r[1]=a.account;r[2]=a.bank;r[7]=a.currency;force(r,r[8]||r[10],r[8]>0);}
for(const [idx,y]of years.entries()){
 const take=()=>{const r=rows[cursor++];r[5]=pick(annualDates.get(y));return r;};
 for(let i=0;i<annual('once',idx);i++){const r=take();r[3]=oneOffNames[oneOffIndex++];r[4]='99559'+String(y)+String(i+1).padStart(10,'0');force(r,(c.bigThreshold+250000000)/(rmbRate(r,fx)||1));r[16]='单次大额货款';}
 for(let i=0;i<annual('big',idx);i++){const r=take();force(r,(c.bigThreshold+1000000+i*17000000)/(rmbRate(r,fx)||1),i%2===0);r[16]='大额业务结算';}
 for(let i=0;i<annual('blankCP',idx);i++){const r=take();r[3]=null;r[4]=null;force(r,2000000+i*110000,false);}
 for(let i=0;i<annual('blankSummary',idx);i++){const r=take();r[16]=null;force(r,3500000+i*130000,i%3===0);}
 for(let i=0;i<annual('person',idx);i++){const r=take();r[3]=nextName(personalNames);r[4]='62229'+String(y)+String(i+1).padStart(10,'0');force(r,128000,false);r[16]='个人业务结算';r[17]='非员工个人往来样例';}
 for(let i=0;i<annual('sameMissing',idx);i++){
  const first=take(),a={name:first[0],account:first[1],bank:first[2],currency:first[7]};let missingAccount;
  do{missingAccount='9966'+String(nextMissing++).padStart(15,'0');}while(occupied.has(missingAccount));
  occupied.add(missingAccount);
  for(const [j,r]of [first,take()].entries()){assign(r,a);r[3]=a.name;r[4]=missingAccount;r[16]='同名账户资金划转';force(r,(25000+12500*i+3750*j),false);}
 }
 const blackOffset=years.slice(0,idx).reduce((n,_,i)=>n+annual('blacklist',i),0);
 for(let i=0;i<annual('blacklist',idx);i++){const r=take();const j=(blackOffset+i)%blacklistPool.length;r[3]=blacklistPool[j];r[4]='9957'+String(j+1).padStart(15,'0');}
 for(let i=0;i<annual('employeeRows',idx);i++){
  const employee=employeeSamples[(idx+i)%employeeSamples.length],r=take();
  assign(r,firstAccountByCompany.get(employee[0]));
  r[3]=employee[2];r[4]='62225'+String(employeeSamples.indexOf(employee)+1).padStart(14,'0');r[16]='代发工资';
  force(r,12000+idx*1200+i*250,false);
 }
 for(let i=0;i<annual('officerRows',idx);i++){
  const officer=officerSamples[(idx+i)%officerSamples.length],r=take();
  assign(r,firstAccountByCompany.get(officer[0]));
  r[3]=officer[1];r[4]='62226'+String(officerSamples.indexOf(officer)+1).padStart(14,'0');r[16]='董监高履职津贴';
  force(r,25000+idx*2100+i*500,false);
 }
 for(const [id,category] of SCENARIO_PAIRS)for(let i=0;i<annual(id,idx);i++){
  const all=plans[category],preferred=category==='nonMerchant'?all.filter(x=>x.preferred):[];
  const list=preferred.length?preferred:all,primary=list.filter(x=>!x.related),secondary=list.filter(x=>x.related);
  const ordered=[];
  for(let j=0;j<Math.max(primary.length,secondary.length);j++){if(primary[j])ordered.push(primary[j]);if(secondary[j])ordered.push(secondary[j]);}
  const choice=ordered[i%ordered.length];
  for(const incoming of [true,false]){
   const r=take();assign(r,choice.a);r[3]=choice.name;r[4]=choice.account;
   r[16]=incoming?'业务往来收款':'业务往来付款';
   force(r,(incoming?800000+i*21000:610000+i*14000)/(rmbRate(r,fx)||1),incoming);
  }
 }
 for(let i=0;i<annual('internalBig',idx);i++){
  const [payer,payee]=internalPair,a=take(),b=take();
  assign(a,payer);assign(b,payee);
  a[3]=payee.name;a[4]=payee.account;b[3]=payer.name;b[4]=payer.account;b[5]=a[5];b[6]=a[6];
  a[16]=b[16]='集团内部大额划拨';
  const amount=(c.bigThreshold+1000000+i*100000)/(rmbRate(a,fx)||1);
  force(a,amount,false);force(b,amount,true);
 }
 take()[16]='存取下';
 for(const a of coverageAccounts)assign(take(),a);
 for(let i=0;i<annual('sameTime',idx);i++){const a=take(),b=take();assign(b,{name:a[0],account:a[1],bank:a[2],currency:a[7]});b[5]=a[5];b[6]=a[6];}
 for(let i=0;i<annual('balanceErrors',idx);i++){
  const a=take(),b=take();assign(b,{name:a[0],account:a[1],bank:a[2],currency:a[7]});b[5]=a[5];a[6]='08:00:00';b[6]='08:00:01';balanceTargets.push(b);
 }
}
for(let i=cursor;i<rows.length-1;i++){if(random()>=c.internal/100)continue;const a=rows[i],other=accounts.filter(b=>b.name!==a[0]&&b.currency===a[7]);if(!other.length)continue;const account=pick(other),b=rows[i+1];a[3]=account.name;a[4]=account.account;a[16]='集团内部资金划拨';b[0]=account.name;b[1]=account.account;b[2]=account.bank;b[7]=account.currency;b[3]=a[0];b[4]=a[1];b[5]=a[5];b[6]=a[6];b[16]='集团内部资金划拨';force(b,Number(a[8]||a[10]),Number(a[10])>0);i++;}
rows.forEach((r,i)=>{r[15]='AC'+r[5].replaceAll('-','')+String(i+1).padStart(7,'0');});
rows.sort((a,b)=>day(a[5]).localeCompare(day(b[5]))||String(a[6]).localeCompare(String(b[6]))||String(a[15]).localeCompare(String(b[15])));
const groups=new Map();for(const r of rows){const k=key(r[0],r[1]);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r);}const opening={};for(const [k,rs]of groups){let net=0,min=0;for(const r of rs){net+=cents(r[8])-cents(r[10]);min=Math.min(min,net);}let balance=Math.round(c.opening*100)-min;opening[k]=balance;for(const r of rs){balance+=cents(r[8])-cents(r[10]);r[12]=money(balance);}}
// Reconcile book balances before deliberate errors; retain accounts absent from the uploaded book tables.
const oldFlowKeys=new Set(source[KEYS.flow].rows.map(r=>key(r[0],r[1])));
const knownBook=new Set([...bookKeys,...accounts.filter(a=>c.companyFlow?.[a.name]===true&&masterKeys.has(key(a.name,a.account))).map(a=>key(a.name,a.account))]),book=d[KEYS.balance].rows.filter(r=>{const k=key(r[0],r[1]);return ix.own.has(r[0])&&years.includes(Number(r[3]))&&!groups.has(k)&&!oldFlowKeys.has(k)&&!customKeys.has(k);});
for(const a of customAccounts){
 const k=key(a.name,a.account);
 if(a.book)knownBook.add(k);else knownBook.delete(k);
 if(a.book&&!a.flow)for(const y of years)book.push([a.name,a.account,a.bank,y,a.currency,100000,0,0,100000,0]);
}
for(const [k,rs]of groups){if(!knownBook.has(k))continue;let begin=opening[k];for(let y=year(c.start);y<=year(c.end);y++){const part=rs.filter(r=>year(r[5])===y);let inc=0,out=0;for(const r of part){inc+=cents(r[8]);out+=cents(r[10]);}const end=begin+inc-out;book.push([rs[0][0],rs[0][1],rs[0][2],y,rs[0][7],money(begin),money(inc),money(out),money(end),part.length]);begin=end;}}
d[KEYS.balance].rows=book;const gl=new Map();for(const r of book){const k=key(r[0],r[3],r[4]);if(!gl.has(k))gl.set(k,[r[0],r[3],r[4],0,0,0,0]);const t=gl.get(k);for(let j=0;j<4;j++)t[j+3]+=cents(r[j+5]);}d[KEYS.gl].rows=[...gl.values()].map(r=>r.map((v,j)=>j>=3?money(v):v));
for(const [i,r]of balanceTargets.entries()){r[12]=money(cents(r[12])+10000+i*1000);r[17]='测试植入：交易后余额错误';}
for(const r of rows)convertRow(r,fx);
d[KEYS.flow].rows=rows;annotate(d);return{data:d,opening,seed:c.seed};}
function periods(d,cut='12-31',first=2023,last=2025){const ds=d[KEYS.flow].rows.map(r=>day(r[5])).sort();const minimum=ds[0]||`${first}-01-01`,maximum=ds.at(-1)||`${last}-12-31`;const out=[];for(let y=first;y<=last;y++){const end=`${y}-${cut}`,prev=`${y-1}-${cut}`;const begin=new Date(Date.parse(prev+'T00:00:00Z')+86400000).toISOString().slice(0,10);out.push({name:String(y),from:begin>minimum?begin:minimum,to:end<maximum?end:maximum,theory:begin+' ～ '+end,partial:begin<minimum||end>maximum});}return[{name:'所选合计',from:out[0].from,to:out.at(-1).to},...out];}
function analysis(d,opt={}){const fx=opt.rates??opt.fx??DEFAULT_FX,value=(r,i)=>rmbCents(r,i,fx);const flow=d[KEYS.flow].rows,ix=indexes(d),categoryByName=counterpartyCategories(d),relatedByName=counterpartyRelationships(d),p=periods(d,opt.cut,opt.first,opt.last),limit=Number(opt.threshold||500000000),known=new Set(d[KEYS.bank].rows.map(r=>key(r[2],String(r[0])))),book=new Set(d[KEYS.balance].rows.map(r=>key(r[0],String(r[1]))));const acct=new Map(),same=new Map(),monthly=new Map(),daily=new Map(),exceptions=[];let inc=0,out=0,internal=0;const ordered=flow.map((r,i)=>({r,i})).sort((a,b)=>day(a.r[5]).localeCompare(day(b.r[5]))||String(a.r[6]).localeCompare(String(b.r[6]))||a.i-b.i);
for(const {r,i}of ordered){const k=key(r[0],String(r[1]));inc+=value(r,8);out+=value(r,10);if(ix.own.has(r[3]))internal++;if(!acct.has(k))acct.set(k,{name:r[0],account:String(r[1]),count:0,in:0,out:0,balance:0,last:null});const a=acct.get(k);if(a.last){const delta=cents(r[12])-cents(a.last[12])-cents(r[8])+cents(r[10]);if(delta)exceptions.push([i+2,r[15],r[0],r[1],day(r[5]),r[6],'余额不连续',money(delta)]);}a.last=r;a.count++;a.in+=value(r,8);a.out+=value(r,10);a.balance=value(r,12);const ownName=String(r[0]||'').trim(),cpName=String(r[3]||'').trim(),cpAccount=String(r[4]||'').trim();if(ix.own.has(r[0])&&cpName===ownName&&cpAccount&&cpAccount!==String(r[1]).trim()&&cents(r[10])>0){const ck=key(ownName,cpAccount);if(!same.has(ck))same.set(ck,{name:ownName,account:cpAccount,count:0,out:0,sources:new Set(),rows:[]});const s=same.get(ck);s.count++;s.out+=value(r,10);s.sources.add(String(r[1]));s.rows.push([ownName,String(r[1]),cpAccount,day(r[5]),r[15],r[7],r[10],money(value(r,10))]);}const dt=day(r[5]);if(!daily.has(dt))daily.set(dt,[dt,0,0,0,0]);const dy=daily.get(dt);dy[1]+=value(r,8);dy[2]+=value(r,10);dy[3]+=Number(money(value(r,8))>0);dy[4]+=Number(money(value(r,10))>0);const mon=day(r[5]).slice(0,7);if(!monthly.has(mon))monthly.set(mon,[mon,0,0,0,0]);const mo=monthly.get(mon);mo[1]+=value(r,8);mo[2]+=value(r,10);mo[3]+=Number(money(value(r,8))>0);mo[4]+=Number(money(value(r,10))>0);}
const missing=[...same].filter(([k])=>!acct.has(k)).map(([,r])=>r);const flowOnly=[...acct].filter(([k])=>!known.has(k)&&!book.has(k)).map(([,r])=>r);const noflow=d[KEYS.bank].rows.filter(r=>!acct.has(key(r[2],String(r[0]))));
const ranking=[],concentration=[],concentrationDetail=[],counterparty=[],scope=[];
for(const period of p){const selected=flow.filter(r=>day(r[5])>=period.from&&day(r[5])<=period.to);const accs=new Map(),cp=new Map();for(const r of selected){const k=key(r[0],r[1]);if(!accs.has(k))accs.set(k,{name:r[0],account:r[1],count:0,total:0,balance:0,date:''});const a=accs.get(k);a.count++;a.total+=value(r,8)+value(r,10);const t=day(r[5])+' '+r[6];if(t>=a.date){a.date=t;a.balance=value(r,12);}if(ix.own.has(r[3]))continue;const mk=key(r[0],r[3]),category=categoryByName.get(String(r[3]??'').trim())||'非客商',relation=relatedByName.has(String(r[3]??'').trim())?'关联方':'第三方';const name=String(r[3]??'').trim(),ck=key(category,relation,name);if(!cp.has(ck))cp.set(ck,{name,category,relation,in:0,out:0,inCount:0,outCount:0});const b=cp.get(ck);b.in+=value(r,8);b.out+=value(r,10);b.inCount+=Number(money(value(r,8))>0);b.outCount+=Number(money(value(r,10))>0);}
scope.push([period.name,period.from,period.to,selected.length,money(selected.reduce((s,r)=>s+value(r,8)+value(r,10),0)),period.partial?'数据仅覆盖部分财年':'']);
for(const metric of ['total','balance']){const sorted=[...accs.values()].sort((a,b)=>b[metric]-a[metric]||String(a.account).localeCompare(String(b.account))),total=sorted.reduce((s,a)=>s+a[metric],0);for(const [label,rs]of [['合计',sorted],['前5',sorted.slice(0,5)],['前10',sorted.slice(0,10)],['前20',sorted.slice(0,20)],['其他',sorted.slice(20)]]){const value=rs.reduce((s,a)=>s+a[metric],0);ranking.push([period.name,metric==='total'?'交易额':'期末余额',label,money(value),rs.reduce((s,a)=>s+a.count,0),total?value/total:0]);}}
const belongs=(part,cat)=>part.category===cat||(part.category==='客商一体'&&(cat==='客户'||cat==='供应商'));
for(const dir of ['in','out']){
 const grouped=new Map();
 for(const part of cp.values()){
  if(part[dir]<=0)continue;
  if(!grouped.has(part.name))grouped.set(part.name,{name:part.name,amount:0,parts:[]});
  const item=grouped.get(part.name);item.amount+=part[dir];item.parts.push(part);
 }
 // Rank the whole external counterparty population before splitting categories.
 // A blank name is one counterparty and participates in the same ranking.
 const ranked=[...grouped.values()].sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name,'zh-CN'));
 const direction=dir==='in'?'流入':'流出';
 const bands=[['合计',ranked],['前5',ranked.slice(0,5)],['前10',ranked.slice(0,10)],['前20',ranked.slice(0,20)],['其他',ranked.slice(20)]];
 for(const cat of ['客户','供应商','客商一体','非客商']){
  const den=ranked.reduce((n,x)=>n+x.parts.filter(p=>belongs(p,cat)).reduce((sum,p)=>sum+p[dir],0),0);
  for(const [i,item] of ranked.entries()){
   for(const part of item.parts.filter(p=>belongs(p,cat)))concentrationDetail.push([period.name,direction,cat,item.name||'【对手方名称为空】',i+1,part.relation,money(part[dir]),part[dir+'Count'],den?part[dir]/den:0]);
  }
  for(const [label,subset] of bands)for(const rel of ['关联方','第三方']){
   const parts=subset.flatMap(x=>x.parts).filter(x=>belongs(x,cat)&&x.relation===rel);
   const amount=parts.reduce((n,x)=>n+x[dir],0),count=parts.reduce((n,x)=>n+x[dir+'Count'],0);
   concentration.push([period.name,direction,cat,rel,label,money(amount),count,den?amount/den:0]);
  }
 }
}
const all=new Map();for(const b of cp.values()){if(!all.has(b.name))all.set(b.name,{...b});else{const t=all.get(b.name);for(const k of ['in','out','inCount','outCount'])t[k]+=b[k];}}for(const dir of ['in','out'])[...all.values()].filter(a=>a[dir]>0).sort((a,b)=>b[dir]-a[dir]||a.name.localeCompare(b.name)).slice(0,20).forEach((a,i)=>counterparty.push([period.name,dir==='in'?'流入':'流出',i+1,a.name||'【对手方为空】',money(a.in),a.inCount,money(a.out),a.outCount]));}
const timeCounts=new Map();for(const r of flow){const k=key(r[0],r[1],day(r[5]),r[6]);timeCounts.set(k,(timeCounts.get(k)||0)+1);}const sameTimeGroups=[...timeCounts.values()].filter(n=>n>1).length;const big=flow.filter(r=>value(r,8)+value(r,10)>=cents(limit)),blankCP=flow.filter(r=>!String(r[3]||'').trim()&&!String(r[4]||'').trim()),blankSummary=flow.filter(r=>!String(r[16]||'').trim());const special=[];for(const [type,rs]of [['大额交易',big],['对手方为空',blankCP],['摘要为空',blankSummary]])for(const r of rs)special.push([type,r[15],r[0],r[1],r[3],r[4],day(r[5]),r[6],r[7],money(value(r,8)),money(value(r,10)),r[16]]);
const coverage=[...[...acct].map(([k,a])=>[a.name,a.account,known.has(k)?'是':'否',book.has(k)?'是':'否',a.count,flowOnly.includes(a)?'仅流水有的本方账号':'已有本方流水']),...missing.map(a=>[a.name,a.account,known.has(key(a.name,a.account))?'是':'否',book.has(key(a.name,a.account))?'是':'否',0,'缺失同名账户']),...noflow.map(r=>[r[2],r[0],'是',book.has(key(r[2],r[0]))?'是':'否',0,'账号主档有但无本方流水'])];
const allCounterpartyCounts=new Map();for(const r of flow)if(r[3])allCounterpartyCounts.set(r[3],(allCounterpartyCounts.get(r[3])||0)+1);
const annualAnomalies=[...new Set(flow.map(r=>year(r[5])))].sort().map(y=>{
 const rs=flow.filter(r=>year(r[5])===y),times=new Map(),counts=new Map();
 for(const r of rs){const t=key(r[0],r[1],day(r[5]),r[6]);times.set(t,(times.get(t)||0)+1);if(r[3])counts.set(r[3],(counts.get(r[3])||0)+1);}
 const isBig=r=>value(r,8)+value(r,10)>=cents(limit);
 return [y,rs.length,rs.filter(isBig).length,rs.filter(r=>!String(r[3]||'').trim()&&!String(r[4]||'').trim()).length,rs.filter(r=>!String(r[16]||'').trim()).length,rs.filter(r=>r[17]==='测试植入：交易后余额错误').length,exceptions.filter(r=>year(r[4])===y).length,[...times.values()].filter(n=>n>1).length,missing.filter(x=>x.rows.some(r=>year(r[3])===y)).length,rs.filter(r=>{const name=String(r[3]??'').trim(),k=key(r[0],r[3]);return name&&[...name].length<=4&&!ix.own.has(r[3])&&!ix.employees.has(k)&&!isRelatedOfficer(name,ix.related.get(k));}).length,rs.filter(r=>isBig(r)&&r[3]&&counts.get(r[3])===1&&allCounterpartyCounts.get(r[3])===1).length,rs.filter(r=>r[16]==='代发工资').length,rs.filter(r=>r[16]==='存取下').length,[...counts.keys()].filter(n=>!ix.own.has(n)&&blacklist.includes(n)).length,
  rs.filter(r=>r[0]!==r[3]&&ix.own.has(r[0])&&ix.own.has(r[3])).length,
  rs.filter(r=>{const k=key(r[0],r[3]);return ix.employees.has(k)&&!ix.own.has(r[3])&&!isRelatedOfficer(r[3],ix.related.get(k));}).length,
  rs.filter(r=>!ix.own.has(r[3])&&isRelatedOfficer(r[3],ix.related.get(key(r[0],r[3])))).length,
  [...ix.own].filter(n=>!rs.some(r=>r[0]===n)).length,
  ...['客户','供应商','客商一体','非客商'].map(category=>rs.filter(r=>r[3]&&companySources.has(r[3])&&!ix.own.has(r[3])&&(category==='非客商'?r[20]==='其他':r[20]===category)).length),
  rs.filter(r=>r[0]!==r[3]&&ix.own.has(r[3])&&isBig(r)).length];
});
const companyEvidence=[...new Set(flow.map(r=>r[3]))].filter(n=>companySources.has(n)||blacklist.includes(n)||ix.own.has(n)).map(n=>[n,...(companySources.get(n)||(blacklist.includes(n)?['用户提供的模拟黑名单','']:['被审计单位主档','']))]);
return{fx,companyEvidence,annualAnomalies,sameTimeGroups,count:flow.length,in:money(inc),out:money(out),total:money(inc+out),accounts:acct.size,companies:ix.own.size,activeCompanies:new Set(flow.map(r=>r[0])).size,internal,big:big.length,blankCP:blankCP.length,blankSummary:blankSummary.length,missing,flowOnly,noflow,exceptions,daily:[...daily.values()].sort((a,b)=>a[0].localeCompare(b[0])).map(r=>r.map((v,i)=>i===1||i===2?money(v):v)),monthly:[...monthly.values()].sort((a,b)=>a[0].localeCompare(b[0])).map(r=>r.map((v,i)=>i===1||i===2?money(v):v)),ranking,concentration,concentrationDetail,counterparty,scope,special,coverage};}
function checksWorkbook(a){return{
'验收总览':{headers:['核验项目','实际结果','说明'],rows:[['同账号同时间交易组',a.sameTimeGroups,'同公司/账号/日期/时间有多条记录'],['流水总笔数',a.count,'按原始流水行数'],['本方账号数',a.accounts,'按本方公司及账号去重'],['被审计单位数',a.companies,'公司主档'],['有流水公司数',a.activeCompanies,'按流水本方名称去重'],['等值人民币流入金额',a.in,'按人民币汇总'],['等值人民币流出金额',a.out,'按人民币汇总'],['等值人民币交易金额',a.total,'人民币流入＋流出'],['大额交易笔数',a.big,'大于或等于所设阈值'],['对手方为空笔数',a.blankCP,'名称与账号均为空'],['摘要为空笔数',a.blankSummary,'空值及纯空格'],['余额断点数',a.exceptions.length,'不含各账号首笔'],['缺失同名账号数',a.missing.length,'仅在对手方出现且公司同名'],['仅流水有的本方账号数',a.flowOnly.length,'不在账号主档与余额表'],['主档账号无流水数',a.noflow.length,'整个上传数据范围']]},
'财年实际范围':{headers:['财年','实际开始','实际结束','笔数','交易金额','提示'],rows:a.scope},
'账号覆盖':{headers:['公司','账号','银行主档存在','余额表存在','本方笔数','分类'],rows:a.coverage},
'余额断点':{headers:['源Excel行号','流水号','公司','账号','日期','时间','问题','余额差额'],rows:a.exceptions},
'专项交易':{headers:['类型','流水号','本方公司','本方账号','对手名称','对手账号','日期','时间','币种','等值人民币流入金额','等值人民币流出金额','摘要'],rows:a.special},
'账户排名':{headers:['期间','排名依据','分布','金额','笔数','占比'],rows:a.ranking},
'集中度报告对照':{headers:['期间','方向','客商分类','关联性质','分布','金额','笔数','占比'],rows:a.concentration},
'集中度排名明细':{headers:['期间','方向','客商分类','对手方名称','全体对手方排名','关联性质','等值人民币金额','交易笔数','金额占比'],rows:a.concentrationDetail},
'对手方前20':{headers:['期间','方向','排名','名称','流入金额','流入笔数','流出金额','流出笔数'],rows:a.counterparty},
'缺失同名账户':{headers:['被审计单位','缺失账号B','已上传付款账号A','付款笔数','等值人民币付款金额','跟进建议'],rows:a.missing.map(x=>[x.name,x.account,[...x.sources].join('、'),x.count,money(x.out),'向客户取得B账号及流水，或检查B是否已上传至其他工作簿'])},
'缺失同名付款明细':{headers:['公司','付款账号A','收款账号B','交易日期','流水号','币种','原币付款金额','等值人民币付款金额'],rows:a.missing.flatMap(x=>x.rows)},
'企业名称来源':{headers:['企业全称','名称来源','来源链接'],rows:a.companyEvidence},
'逐年异常覆盖':{headers:['年份','流水笔数','大额笔数','对手方空白笔数','摘要空白笔数','植入余额错误笔数','余额断点笔数','同时间组数','缺失同名账号数','其他个人笔数','全期仅一次大额笔数','代发工资笔数','存取下笔数','模拟黑名单家数','被审计单位间流水笔数','员工对手方笔数','董监高对手方笔数','本年无流水单位个数','仅客户企业往来笔数','仅供应商企业往来笔数','客商重合企业往来笔数','非客商企业往来笔数','合并范围内大额流水笔数'],rows:a.annualAnomalies},
'每日趋势':{headers:['交易日期','流入金额','流出金额','流入笔数','流出笔数'],rows:a.daily},
'月度趋势':{headers:['月份','流入金额','流出金额','流入笔数','流出笔数'],rows:a.monthly},
'核验口径':{headers:['项目','说明'],rows:[['金额','金额折算为人民币后加总；逐笔折算保留两位小数。'],['折算汇率（CNY/原币）',Object.entries(typeof a.fx==='number'?{USD:a.fx}:a.fx).filter(([k])=>k!=='original').map(([k,v])=>k+' '+v).join('；')],['余额','账户余额取该期间最后一笔交易后等值人民币余额，不加总年度余额。'],['集中度','先按每个客商分类的对手方金额排名，再拆关联方/第三方。占比按该客商分类方向总金额。空白名称金额及笔数归入合计和其他，跳过排名。'],['内部交易','被审计单位之间往来从集中度、对手方前20剔除。'],['个人识别','按员工名单及简短姓名作测试标签，不替代真实个人识别。'],['余额断点','比较同账号上一笔余额＋本笔流入－流出；不验证每账号首笔期初。'],['资料性质','全部银行账户、人员关系和交易为测试资料，不表示真实企业事实。']]}};}
g.AuditEngine={KEYS,counterpartyCategories,counterpartyRelationships,copy,rename,annotate,validate,generate,generationAccounts,addCompany,removeCompany,previewFlowRows,masterSamples,MASTER_GROUPS,ACCOUNT_GROUPS,companyCatalog,companyGroups,availableCompanyGroups,analysis,checksWorkbook,periods,accountList,randomCompanies,currencyCode,cents,money,isRelatedOfficer,DEFAULT_FX,rmbCents,convertRow,blacklist:Object.freeze(blacklist)};
})(globalThis);
