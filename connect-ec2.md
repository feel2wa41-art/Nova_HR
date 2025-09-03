# EC2 접속 방법

## 방법 1: EC2 Instance Connect (웹 브라우저)
1. https://ap-southeast-3.console.aws.amazon.com/ec2 접속
2. 인스턴스 목록에서 `16.78.76.150` 선택
3. **연결** 버튼 클릭
4. **EC2 Instance Connect** 탭 선택
5. 사용자 이름: `ubuntu`
6. **연결** 클릭

## 방법 2: AWS CLI
```bash
aws configure set region ap-southeast-3
aws ec2-instance-connect ssh --instance-id [인스턴스-ID]
```

## 방법 3: Session Manager
```bash
aws ssm start-session --target [인스턴스-ID] --region ap-southeast-3
```

## SSH 키가 있는 경우
```bash
ssh -i nova-hr-key.pem ubuntu@16.78.76.150
```

## 인스턴스 정보 확인
```bash
aws ec2 describe-instances --region ap-southeast-3 --filters "Name=ip-address,Values=16.78.76.150"
```